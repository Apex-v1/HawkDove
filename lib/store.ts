export type Choice = 'hawk' | 'dove'
export type Week = 1 | 2
export type PairType = 'H+H' | 'H+D' | 'D+D' | 'STAPLED'
export type RoundPhase = 'open' | 'pending_review' | 'finalized'

export interface Student {
  id: string
  name: string
  email: string
  tiebreaker: number
  points: number
  choice?: Choice
  hasChosen: boolean
  staplePartnerId?: string
  isHawkInStaple?: boolean
  stapleTransferAmount?: number
  isEliminated: boolean
  roundHistory: { round: number; type: string; pair: string; result: string }[]
}

export interface PairingResult {
  pairingId: string; type: PairType
  aId: string; bId: string; aChoice: Choice; bChoice: Choice
  aDelta: number; bDelta: number
  diceRoll?: number; coinFlip?: string; note: string
}

export interface RoundRecord {
  round: number; week: Week; phase: RoundPhase
  pairings: PairingResult[]
  snapshotBefore: Record<string, number>
  snapshotAfter: Record<string, number>
  computedAt: string; finalizedAt?: string
}

export interface GameState {
  week: Week; currentRound: number
  students: Student[]; rounds: RoundRecord[]
  roundOpen: boolean; displayRound?: number; pendingRound?: RoundRecord
  adminPassword: string
}

const KV_KEY = 'hd_game_state_v3'
let _mem: GameState | null = null

function makeDefault(): GameState {
  return {
    week: 1, currentRound: 0, students: [], rounds: [],
    roundOpen: false,
    adminPassword: process.env.ADMIN_PASSWORD || 'hawk2024admin',
  }
}

async function kvGet(): Promise<GameState | null> {
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
    const raw = await redis.get(KV_KEY)
    if (!raw) return null
    if (typeof raw === 'string') return JSON.parse(raw) as GameState
    return raw as GameState
  } catch(e) { console.error('REDIS GET FAILED:', e); return null }
}

async function kvSet(state: GameState): Promise<void> {
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
    await redis.set(KV_KEY, state)
  } catch(e) { console.error("REDIS SET FAILED:", e) }
}

export async function getState(): Promise<GameState> {
  _mem = null  // ← add this line
  const persisted = await kvGet()
  if (persisted) {
    persisted.adminPassword = process.env.ADMIN_PASSWORD || 'hawk2024admin'
    _mem = persisted
    return _mem
  }
  _mem = makeDefault()
  return _mem
}

async function save(): Promise<void> { if (_mem) await kvSet(_mem) }

export async function resetState(): Promise<void> { _mem = makeDefault(); await save() }

export async function loadRoster(rows: {
  name: string; email: string; tiebreaker: number; points: number
  roundType?: string; roundResult?: string; roundPair?: string
}[]): Promise<void> {
  const s = await getState()
  s.students = rows.map((r, i) => ({
    id: `s${i}_${r.name.replace(/\W+/g, '').toLowerCase().slice(0, 8)}`,
    name: r.name, email: r.email,
    tiebreaker: r.tiebreaker ?? 0,
    points: r.points ?? 0,
    hasChosen: false, isEliminated: false,
    roundHistory: r.roundType ? [{
      round: s.currentRound || 1,
      type: r.roundType || '',
      pair: r.roundPair || '',
      result: r.roundResult || '',
    }] : [],
  }))
  await save()
}

export async function updateStudent(id: string, fields: Partial<Pick<Student, 'points' | 'tiebreaker' | 'email' | 'name' | 'isEliminated'>>): Promise<void> {
  const s = await getState()
  const st = s.students.find(x => x.id === id)
  if (!st) return
  Object.assign(st, fields)
  await save()
}

export async function setStaple(aId: string, bId: string, hawkId: string): Promise<void> {
  const s = await getState()
  const a = s.students.find(x => x.id === aId)
  const b = s.students.find(x => x.id === bId)
  if (!a || !b) return
  a.staplePartnerId = bId; a.isHawkInStaple = a.id === hawkId
  b.staplePartnerId = aId; b.isHawkInStaple = b.id === hawkId
  await save()
}

export async function removeStaple(id: string): Promise<void> {
  const s = await getState()
  const st = s.students.find(x => x.id === id)
  if (!st?.staplePartnerId) return
  const partner = s.students.find(x => x.id === st.staplePartnerId)
  if (partner) { partner.staplePartnerId = undefined; partner.isHawkInStaple = undefined }
  st.staplePartnerId = undefined; st.isHawkInStaple = undefined
  await save()
}

export async function setStapleTransfer(hawkId: string, amount: number): Promise<void> {
  const s = await getState()
  const h = s.students.find(x => x.id === hawkId)
  if (h) { h.stapleTransferAmount = amount; await save() }
}

export async function openRound(): Promise<void> {
  const s = await getState()
  s.roundOpen = true
  s.students.forEach(st => { st.hasChosen = false; st.choice = undefined })
  await save()
}

export async function closeRound(): Promise<void> {
  const s = await getState()
  s.roundOpen = false
  await save()
}

export async function submitChoice(studentId: string, choice: Choice): Promise<boolean> {
  const s = await getState()
  if (!s.roundOpen) return false
  const st = s.students.find(x => x.id === studentId)
  if (!st || st.isEliminated) return false
  st.choice = choice; st.hasChosen = true
  await save()
  return true
}

export async function computeRound(): Promise<RoundRecord> {
  const s = await getState()
  const snapshotBefore: Record<string, number> = {}
  s.students.forEach(st => { snapshotBefore[st.name] = st.points })

  const active = s.students.filter(st => !st.isEliminated)
  const pairings: PairingResult[] = []
  const paired = new Set<string>()

  if (s.week === 2) {
    active.forEach(st => {
      if (st.staplePartnerId && st.isHawkInStaple && !paired.has(st.id)) {
        const dove = s.students.find(x => x.id === st.staplePartnerId)
        if (!dove) return
        paired.add(st.id); paired.add(dove.id)
        const taken = Math.round(dove.points * 0.25 * 100) / 100
        const gain = Math.round(taken * 3 * 100) / 100
        const xfer = st.stapleTransferAmount ?? 0
        pairings.push({
          pairingId: `r${s.currentRound + 1}_staple_${st.id}`,
          type: 'STAPLED', aId: st.id, bId: dove.id,
          aChoice: 'hawk', bChoice: 'dove',
          aDelta: Math.round((gain - xfer) * 100) / 100,
          bDelta: Math.round((-taken + xfer) * 100) / 100,
          note: `${st.name} (Hawk) takes 25% of ${dove.name}'s ${dove.points}pts ×3 = +${gain}. Returns ${xfer}pts.`,
        })
      }
    })
  }

  const free = active.filter(st => !paired.has(st.id))
  const shuffled = [...free].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i], b = shuffled[i + 1]
    paired.add(a.id); paired.add(b.id)
    const ca: Choice = a.choice || 'dove'
    const cb: Choice = b.choice || 'dove'
    let aDelta = 0, bDelta = 0, note = ''
    let type: PairType, diceRoll: number | undefined, coinFlip: string | undefined

    if (ca === 'hawk' && cb === 'hawk') {
  type = 'H+H'
  const aTb = a.tiebreaker ?? 0
  const bTb = b.tiebreaker ?? 0
if (aTb > bTb) {
    aDelta = b.points; bDelta = -b.points
    note = `${a.name} > ${b.name} — higher tiebreaker takes all`
  } else if (bTb > aTb) {
    bDelta = a.points; aDelta = -a.points
    note = `${b.name} > ${a.name} — higher tiebreaker takes all`
  } else {
    coinFlip = Math.random() > 0.5 ? 'heads' : 'tails'
    if (coinFlip === 'heads') { aDelta = b.points; bDelta = -b.points; note = `Tied — coin flip heads → ${a.name} wins` }
    else { bDelta = a.points; aDelta = -a.points; note = `Tied — coin flip tails → ${b.name} wins` }
  }
    } else if (ca === 'dove' && cb === 'dove') {
      type = 'D+D'; diceRoll = Math.floor(Math.random() * 20) + 1
      aDelta = diceRoll; bDelta = diceRoll
      note = `Both Dove — dice roll: ${diceRoll}, each gains +${diceRoll}pts`
    } else {
      type = 'H+D'
      const [hawk, dove, hIsA] = ca === 'hawk' ? [a, b, true] : [b, a, false]
      const taken = Math.round(dove.points * 0.25 * 100) / 100
      const gain = Math.round(taken * 3 * 100) / 100
      if (hIsA) { aDelta = gain; bDelta = -taken } else { bDelta = gain; aDelta = -taken }
      note = `${hawk.name} (Hawk) takes 25% of ${dove.name}'s ${dove.points}pts ×3 = +${gain}`
    }

    pairings.push({
      pairingId: `r${s.currentRound + 1}_${a.id}_${b.id}`,
      type, aId: a.id, bId: b.id, aChoice: ca, bChoice: cb,
      aDelta: Math.round(aDelta * 100) / 100,
      bDelta: Math.round(bDelta * 100) / 100,
      diceRoll, coinFlip, note,
    })
  }

  if (shuffled.length % 2 === 1) {
    const out = shuffled[shuffled.length - 1]
    pairings.push({
      pairingId: `r${s.currentRound + 1}_sitsout_${out.id}`,
      type: 'D+D', aId: out.id, bId: out.id,
      aChoice: out.choice || 'dove', bChoice: out.choice || 'dove',
      aDelta: 0, bDelta: 0, note: `${out.name} sits out (odd number) — no change`,
    })
  }

  const snapshotAfter: Record<string, number> = { ...snapshotBefore }
  pairings.forEach(p => {
    if (p.aId === p.bId) return
    const a = s.students.find(x => x.id === p.aId)!
    const b = s.students.find(x => x.id === p.bId)!
    snapshotAfter[a.name] = Math.round((snapshotBefore[a.name] + p.aDelta) * 100) / 100
    snapshotAfter[b.name] = Math.round((snapshotBefore[b.name] + p.bDelta) * 100) / 100
  })

  const record: RoundRecord = {
    round: s.currentRound + 1, week: s.week, phase: 'pending_review',
    pairings, snapshotBefore, snapshotAfter,
    computedAt: new Date().toISOString(),
  }
  s.pendingRound = record
  await save()
  return record
}

export async function finalizeRound(): Promise<RoundRecord> {
  const s = await getState()
  const r = s.pendingRound
  if (!r) throw new Error('No pending round')
  r.pairings.forEach(p => {
    if (p.aId === p.bId) return
    const a = s.students.find(x => x.id === p.aId)!
    const b = s.students.find(x => x.id === p.bId)!
    a.points = Math.max(0, Math.round((a.points + p.aDelta) * 100) / 100)
    b.points = Math.max(0, Math.round((b.points + p.bDelta) * 100) / 100)
    // Auto-elimination disabled — use admin panel to manually eliminate players
    // append to round history
    const pa = s.students.find(x => x.id === p.aId)!
    const pb = s.students.find(x => x.id === p.bId)!
    pa.roundHistory = pa.roundHistory || []
    pb.roundHistory = pb.roundHistory || []
    pa.roundHistory.push({ round: r.round, type: p.type, pair: pb.name, result: `${p.aDelta >= 0 ? '+' : ''}${p.aDelta}` })
    pb.roundHistory.push({ round: r.round, type: p.type, pair: pa.name, result: `${p.bDelta >= 0 ? '+' : ''}${p.bDelta}` })
  })
  r.phase = 'finalized'; r.finalizedAt = new Date().toISOString()
  s.rounds.push(r); s.currentRound++; s.pendingRound = undefined; s.roundOpen = false
  await save()
  return r
}

export async function setDisplayRound(round: number): Promise<void> {
  const s = await getState()
  s.displayRound = round
  await save()
}

export async function checkAdmin(pw: string): Promise<boolean> {
  const s = await getState()
  return pw === s.adminPassword
}
