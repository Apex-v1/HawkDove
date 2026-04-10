'use client'
import { useState, useEffect, useCallback } from 'react'

interface StudentInfo {
  id: string; name: string; email: string; points: number
  hasChosen: boolean; choice?: string; isEliminated: boolean
  staplePartnerId?: string
}

interface GameInfo {
  roundOpen: boolean; currentRound: number; week: number
  students: StudentInfo[]
  lastRound: { round: number; pairings: Pairing[]; snapshotAfter: Record<string,number> } | null
}

interface Pairing {
  pairingId: string; type: string
  aId: string; bId: string
  aChoice: string; bChoice: string
  aDelta: number; bDelta: number; note: string
  diceRoll?: number
}

const COOKIE = 'hd_student_id'

function getCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : ''
}
function setCookie(name: string, val: string) {
  document.cookie = `${name}=${encodeURIComponent(val)};max-age=${60*60*24*365};path=/;samesite=lax`
}

export default function PlayerPage() {
  const [game, setGame] = useState<GameInfo | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const fetchGame = useCallback(async () => {
    const res = await fetch('/api/game', { cache: 'no-store' })
    const data = await res.json()
    setGame(data)
  }, [])

  useEffect(() => {
    const saved = getCookie(COOKIE)
    if (saved) setMyId(saved)
    fetchGame()
    const iv = setInterval(fetchGame, 3000)
    return () => clearInterval(iv)
  }, [fetchGame])

  async function choose(choice: 'hawk' | 'dove') {
    if (!myId || submitting) return
    setSubmitting(true); setError('')
    const res = await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: myId, choice }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Error')
    else await fetchGame()
    setSubmitting(false)
  }

  function selectStudent(id: string) {
    setMyId(id); setCookie(COOKIE, id); setShowPicker(false); setSearch('')
  }

  const me = game?.students.find(s => s.id === myId)
  const myPairing = game?.lastRound?.pairings.find(p => p.aId === myId || p.bId === myId)
  const myNewPoints = myPairing
    ? (myPairing.aId === myId
        ? Math.round(((game?.students.find(s => s.id === myId)?.points ?? 0)) * 100) / 100
        : Math.round(((game?.students.find(s => s.id === myId)?.points ?? 0)) * 100) / 100)
    : null

  const filtered = game?.students.filter(s =>
    !s.isEliminated && s.name.toLowerCase().includes(search.toLowerCase())
  ) || []

  // ── No student selected ──────────────────────────────────────────────────
  if (!myId || !me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="label" style={{ marginBottom: 8 }}>Social Redistribution Game</div>
            <div style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--hawk)' }}>HAWK</span>
              <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
              <span style={{ color: 'var(--dove)' }}>DOVE</span>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="label" style={{ marginBottom: 12 }}>Who are you?</div>
            <input
              className="input" placeholder="Search your name..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto' }}>
              {!game && <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '8px 0' }}>Loading...</div>}
              {game && filtered.length === 0 && search && (
                <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '8px 0' }}>No match</div>
              )}
              {filtered.map(s => (
                <button key={s.id} onClick={() => selectStudent(s.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px',
                    background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
                    color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-raised)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{s.name}</span>
                  <span style={{ color: 'var(--gold)', fontSize: 12 }}>{s.points} pts</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Student identified ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          <span style={{ color: 'var(--hawk)' }}>HAWK</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>/</span>
          <span style={{ color: 'var(--dove)' }}>DOVE</span>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '5px 10px' }}
          onClick={() => { setMyId(''); setCookie(COOKIE, '') }}>
          Switch
        </button>
      </div>

      {/* My card */}
      <div className="card fade-in" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Player</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>{me.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{me.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label" style={{ marginBottom: 4 }}>Balance</div>
            <div style={{ fontSize: 32, fontWeight: 500, color: 'var(--gold)', lineHeight: 1 }}>{me.points}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>pts</div>
          </div>
        </div>

        {/* Round + choice status */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="label">Round {game?.currentRound ?? 0}</div>
            {game?.week === 2 && me.staplePartnerId && (
              <span className="tag tag-staple">📌 Stapled</span>
            )}
          </div>

          {me.hasChosen && me.choice && (
            <div style={{ marginTop: 10 }}>
              <span className={`tag ${me.choice === 'hawk' ? 'tag-hawk' : 'tag-dove'}`}>
                {me.choice === 'hawk' ? '🦅 HAWK' : '🕊️ DOVE'} — submitted
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action area */}
      {me.isEliminated ? (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💀</div>
          <div style={{ color: 'var(--hawk)', fontWeight: 500 }}>Eliminated</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>Your points reached zero.</div>
        </div>
      ) : game?.roundOpen && !me.hasChosen ? (
        <div className="card fade-in" style={{ padding: 20 }}>
          <div className="label" style={{ marginBottom: 16 }}>Choose your strategy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="btn btn-hawk" disabled={submitting}
              onClick={() => choose('hawk')}
              style={{ padding: '24px 12px', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🦅</span>
              HAWK
              <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, letterSpacing: 0, textTransform: 'none' }}>Aggressive</span>
            </button>
            <button className="btn btn-dove" disabled={submitting}
              onClick={() => choose('dove')}
              style={{ padding: '24px 12px', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🕊️</span>
              DOVE
              <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, letterSpacing: 0, textTransform: 'none' }}>Cooperative</span>
            </button>
          </div>
          {error && <div style={{ color: 'var(--hawk)', fontSize: 12, marginTop: 10 }}>{error}</div>}

          {/* Payoff reminder */}
          <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom: 8 }}>Payoff rules</div>
            <div style={{ fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.7 }}>
              <div><span style={{ color: 'var(--dove)' }}>D+D</span> → Both gain +1–20 pts (random)</div>
              <div><span style={{ color: 'var(--hawk)' }}>H+D</span> → Hawk takes 25% of Dove ×3</div>
              <div><span style={{ color: 'var(--hawk)' }}>H+H</span> → Higher pts takes everything</div>
            </div>
          </div>
        </div>
      ) : game?.roundOpen && me.hasChosen ? (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Choice locked in. Waiting for round to close.</div>
        </div>
      ) : !game?.roundOpen && me.hasChosen && game?.lastRound && game.lastRound.round === game.currentRound ? (
        // Show result of last round
        <ResultCard pairing={myPairing} me={me} students={game.students} />
      ) : (
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.7 }}>
            {game?.currentRound === 0
              ? 'Waiting for the instructor to open the first round.'
              : 'Round closed. Waiting for the next round.'}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultCard({ pairing, me, students }: {
  pairing?: Pairing; me: StudentInfo; students: StudentInfo[]
}) {
  if (!pairing || pairing.aId === pairing.bId) {
    return (
      <div className="card fade-in" style={{ padding: 20 }}>
        <div className="label" style={{ marginBottom: 8 }}>Last Round</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>You sat out this round (odd number of players).</div>
      </div>
    )
  }
  const isA = pairing.aId === me.id
  const myDelta = isA ? pairing.aDelta : pairing.bDelta
  const myChoice = isA ? pairing.aChoice : pairing.bChoice
  const oppId = isA ? pairing.bId : pairing.aId
  const oppChoice = isA ? pairing.bChoice : pairing.aChoice
  const opp = students.find(s => s.id === oppId)
  const deltaColor = myDelta > 0 ? 'var(--green)' : myDelta < 0 ? 'var(--hawk)' : 'var(--text-dim)'

  return (
    <div className="card fade-in" style={{ padding: 20 }}>
      <div className="label" style={{ marginBottom: 12 }}>Round result</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>YOU</div>
          <div className={`tag tag-${myChoice}`} style={{ fontSize: 13 }}>
            {myChoice === 'hawk' ? '🦅' : '🕊️'} {myChoice.toUpperCase()}
          </div>
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--text-dim)', fontSize: 11 }}>vs</div>
        <div style={{ flex: 1, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{opp?.name.split(',')[0] ?? '?'}</div>
          <div className={`tag tag-${oppChoice}`} style={{ fontSize: 13 }}>
            {oppChoice === 'hawk' ? '🦅' : '🕊️'} {oppChoice.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>Your change</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: deltaColor }}>
          {myDelta > 0 ? '+' : ''}{myDelta}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>New balance</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--gold)' }}>{me.points}</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{pairing.note}</div>
    </div>
  )
}
