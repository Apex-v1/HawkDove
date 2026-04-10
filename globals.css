'use client'
import { useState, useEffect, useCallback } from 'react'

type Tab = 'roster' | 'round' | 'history' | 'insights'

interface Student { id: string; name: string; email: string; points: number; hasChosen: boolean; choice?: string; isEliminated: boolean; staplePartnerId?: string; isHawkInStaple?: boolean; stapleTransferAmount?: number }
interface Pairing { pairingId: string; type: string; aId: string; bId: string; aChoice: string; bChoice: string; aDelta: number; bDelta: number; note: string; diceRoll?: number; coinFlip?: string }
interface RoundRecord { round: number; week: number; phase: string; pairings: Pairing[]; snapshotBefore: Record<string,number>; snapshotAfter: Record<string,number>; computedAt: string; finalizedAt?: string }
interface GameState { week: number; currentRound: number; students: Student[]; rounds: RoundRecord[]; roundOpen: boolean; pendingRound?: RoundRecord }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('roster')
  const [loading, setLoading] = useState('')
  const [csvText, setCsvText] = useState('')
  const [csvError, setCsvError] = useState('')
  const [stapleA, setStapleA] = useState('')
  const [stapleB, setStapleB] = useState('')
  const [stapleHawk, setStapleHawk] = useState('')
  const [editDeltas, setEditDeltas] = useState<Record<string, {a:string,b:string}>>({})

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/admin/control', { cache: 'no-store' })
    if (res.status === 401) { setAuthed(false); return }
    const data = await res.json()
    setState(data.state)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchState()
    const iv = setInterval(fetchState, 3000)
    return () => clearInterval(iv)
  }, [authed, fetchState])

  async function login() {
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: pw }) })
    if (res.ok) { setAuthed(true); setPwErr('') }
    else setPwErr('Wrong password')
  }

  async function act(action: string, payload: Record<string,unknown> = {}) {
    setLoading(action)
    const res = await fetch('/api/admin/control', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action, payload }) })
    const data = await res.json()
    if (data.state) setState(data.state)
    setLoading('')
    return data
  }

  function parseCSV(text: string): { name: string; email: string; points: number }[] | null {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { setCsvError('Need header row + data rows'); return null }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const ni = header.findIndex(h => h.includes('name'))
    const ei = header.findIndex(h => h.includes('email'))
    const pi = header.findIndex(h => h.includes('point') || h.includes('pts'))
    if (ni === -1 || pi === -1) { setCsvError('Need columns: name, email (optional), points/pts'); return null }
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      const name = cols[ni]?.trim()
      if (!name) continue
      const email = ei >= 0 ? (cols[ei]?.trim() || '') : ''
      const pts = parseFloat(cols[pi] || '0') || 0
      rows.push({ name, email, points: pts })
    }
    if (rows.length === 0) { setCsvError('No valid rows found'); return null }
    return rows
  }

  async function uploadRoster() {
    setCsvError('')
    const rows = parseCSV(csvText)
    if (!rows) return
    await act('load_roster', { students: rows })
    setCsvText('')
  }

  async function addStaple() {
    if (!stapleA || !stapleB || !stapleHawk) return
    await act('set_staple', { aId: stapleA, bId: stapleB, hawkId: stapleHawk })
    setStapleA(''); setStapleB(''); setStapleHawk('')
  }

  async function updateDelta(pairingId: string) {
    const ed = editDeltas[pairingId]
    if (!ed) return
    await act('update_points', { pairingId, aDelta: parseFloat(ed.a), bDelta: parseFloat(ed.b) })
    setEditDeltas(prev => { const n = {...prev}; delete n[pairingId]; return n })
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 500 }}>
            <span style={{ color: 'var(--hawk)' }}>HAWK</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--dove)' }}>DOVE</span>
          </div>
          <div className="label" style={{ marginTop: 6 }}>Admin Panel</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <input type="password" className="input" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} autoFocus />
          {pwErr && <div style={{ color: 'var(--hawk)', fontSize: 12, marginTop: 8 }}>{pwErr}</div>}
          <button className="btn btn-gold" style={{ width: '100%', marginTop: 12, padding: 12 }} onClick={login}>Enter →</button>
        </div>
      </div>
    </div>
  )

  if (!state) return <div style={{ padding: 32, color: 'var(--text-dim)' }}>Loading...</div>

  const active = state.students.filter(s => !s.isEliminated)
  const submitted = active.filter(s => s.hasChosen).length
  const stapledPairs = state.students.filter(s => s.staplePartnerId && s.isHawkInStaple)

  // ── MAIN UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            <span style={{ color: 'var(--hawk)' }}>HAWK</span>
            <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>/</span>
            <span style={{ color: 'var(--dove)' }}>DOVE</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 12 }}>Admin</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatPill label="Week" value={state.week} />
          <StatPill label="Round" value={state.currentRound} />
          <StatPill label="Players" value={active.length} />
          <StatPill label="Submitted" value={`${submitted}/${active.length}`} color={submitted === active.length && active.length > 0 ? 'var(--green)' : 'var(--gold)'} />
          {state.roundOpen && <span className="tag tag-dove pulse">● OPEN</span>}
          {state.pendingRound && <span className="tag tag-gold">⏳ PENDING REVIEW</span>}
          <button className="btn btn-danger" style={{ fontSize: 10, padding: '5px 10px' }} onClick={() => { if (confirm('Reset everything?')) act('reset') }}>Reset</button>
        </div>
      </div>

      {/* Round controls bar */}
      <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="label" style={{ marginRight: 4 }}>Week:</div>
        {[1,2].map(w => (
          <button key={w} className={`btn ${state.week === w ? 'btn-gold' : 'btn-ghost'}`} style={{ padding: '6px 14px', fontSize: 11 }}
            onClick={() => act('set_week', { week: w })}>Week {w}</button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        {!state.roundOpen && !state.pendingRound && (
          <button className="btn btn-dove" style={{ padding: '8px 16px' }} onClick={() => act('open_round')} disabled={!!loading}>
            ▶ Open Round {state.currentRound + 1}
          </button>
        )}
        {state.roundOpen && (
          <>
            <button className="btn btn-ghost" style={{ padding: '8px 16px' }} onClick={() => act('close_round')}>Close submissions</button>
            <button className="btn btn-gold" style={{ padding: '8px 16px' }}
              onClick={async () => { await act('compute_round'); setTab('round') }}
              disabled={!!loading}>
              {loading === 'compute_round' ? 'Computing...' : '⚡ Compute Round'}
            </button>
          </>
        )}
        {state.pendingRound && (
          <button className="btn btn-hawk" style={{ padding: '8px 16px' }}
            onClick={async () => { await act('finalize_round'); setTab('history') }}
            disabled={!!loading}>
            {loading === 'finalize_round' ? 'Finalizing...' : '✓ Finalize & Push Results'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {(['roster','round','history','insights'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '9px 18px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              color: tab === t ? 'var(--text)' : 'var(--text-dim)',
              borderBottom: tab === t ? '2px solid var(--dove)' : '2px solid transparent',
              transition: 'all 0.12s',
            }}>
            {t === 'round' && state.pendingRound ? '⏳ Review' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ROSTER TAB ───────────────────────────────────────────────────── */}
      {tab === 'roster' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* CSV Upload */}
          <div className="card" style={{ padding: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>Upload Roster (CSV)</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.6 }}>
              Paste CSV with columns: <code style={{ color: 'var(--dove)' }}>name, email, points</code><br/>
              Header row required. Email optional.
            </div>
            <textarea className="input" rows={8} placeholder={"name,email,points\nSmith, John,john@uni.edu,100\nDoe, Jane,jane@uni.edu,85"}
              value={csvText} onChange={e => setCsvText(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 11 }} />
            {csvError && <div style={{ color: 'var(--hawk)', fontSize: 11, marginTop: 6 }}>{csvError}</div>}
            <button className="btn btn-gold" style={{ marginTop: 10, width: '100%', padding: 10 }} onClick={uploadRoster}>
              Upload & Replace Roster
            </button>
          </div>

          {/* Staple manager */}
          <div className="card" style={{ padding: 16 }}>
            <div className="label" style={{ marginBottom: 12 }}>Stapled Pairs (Week 2)</div>
            {state.students.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Upload roster first.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <select className="input" value={stapleA} onChange={e => setStapleA(e.target.value)}>
                    <option value="">Player A...</option>
                    {state.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="input" value={stapleB} onChange={e => setStapleB(e.target.value)}>
                    <option value="">Player B...</option>
                    {state.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="input" value={stapleHawk} onChange={e => setStapleHawk(e.target.value)}>
                    <option value="">Who is the Hawk?</option>
                    {[stapleA, stapleB].filter(Boolean).map(id => {
                      const s = state.students.find(x => x.id === id)
                      return s ? <option key={s.id} value={s.id}>{s.name}</option> : null
                    })}
                  </select>
                  <button className="btn btn-gold" style={{ padding: 9 }} onClick={addStaple} disabled={!stapleA || !stapleB || !stapleHawk}>
                    📌 Staple Pair
                  </button>
                </div>

                {stapledPairs.length === 0
                  ? <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No stapled pairs yet.</div>
                  : stapledPairs.map(hawk => {
                    const dove = state.students.find(s => s.id === hawk.staplePartnerId)
                    if (!dove) return null
                    return (
                      <div key={hawk.id} className="card-raised" style={{ padding: 10, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--hawk)' }}>🦅 {hawk.name}</span>
                            <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>↔</span>
                            <span style={{ color: 'var(--dove)' }}>🕊️ {dove.name}</span>
                          </span>
                          <button className="btn btn-danger" style={{ fontSize: 9, padding: '3px 8px' }} onClick={() => act('remove_staple', { id: hawk.id })}>Remove</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Hawk returns:</span>
                          <input type="number" className="input" style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
                            placeholder="0"
                            defaultValue={hawk.stapleTransferAmount ?? ''}
                            onChange={e => act('set_staple_transfer', { hawkId: hawk.id, amount: parseFloat(e.target.value) || 0 })} />
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>pts</span>
                        </div>
                      </div>
                    )
                  })}
              </>
            )}
          </div>

          {/* Full student table */}
          <div className="card" style={{ padding: 16, gridColumn: '1 / -1' }}>
            <div className="label" style={{ marginBottom: 12 }}>All Students — {state.students.length} total</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name','Email','Points','Choice','Stapled','Eliminated'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontSize: 10, letterSpacing: '0.15em' }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...state.students].sort((a,b) => b.points - a.points).map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', opacity: s.isEliminated ? 0.4 : 1, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text)' }}>{s.name}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-dim)' }}>{s.email}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--gold)', fontWeight: 500 }}>{s.points}</td>
                      <td style={{ padding: '6px 10px' }}>
                        {s.choice ? <span className={`tag tag-${s.choice}`}>{s.choice}</span> : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {s.staplePartnerId ? <span className="tag tag-staple">{s.isHawkInStaple ? '🦅 Hawk' : '🕊️ Dove'}</span> : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', color: s.isEliminated ? 'var(--hawk)' : 'var(--text-dim)' }}>
                        {s.isEliminated ? '💀' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ROUND REVIEW TAB ─────────────────────────────────────────────── */}
      {tab === 'round' && (
        <div>
          {!state.pendingRound ? (
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No round pending review. Compute a round first.</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div className="label">Round {state.pendingRound.round} — Pending Review</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Computed {new Date(state.pendingRound.computedAt).toLocaleTimeString()}. Edit deltas below, then finalize.</div>
                </div>
                <button className="btn btn-hawk" style={{ padding: '10px 20px' }}
                  onClick={async () => { await act('finalize_round'); setTab('history') }}>
                  ✓ Finalize & Push Results
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['#','Type','Player A','Choice','Pts Before','Delta A','Player B','Choice','Pts Before','Delta B','Note','Edit'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontSize: 10, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.pendingRound.pairings.map((p, i) => {
                      const a = state.students.find(s => s.id === p.aId)
                      const b = state.students.find(s => s.id === p.bId)
                      const aAfter = state.pendingRound!.snapshotAfter[a?.name ?? '']
                      const bAfter = state.pendingRound!.snapshotAfter[b?.name ?? '']
                      const isEditing = !!editDeltas[p.pairingId]
                      const isSitsOut = p.aId === p.bId
                      const typeColor = p.type === 'H+H' ? 'var(--hawk)' : p.type === 'D+D' ? 'var(--green)' : p.type === 'STAPLED' ? 'var(--gold)' : 'var(--dove)'
                      return (
                        <tr key={p.pairingId} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'rgba(232,160,32,0.04)' : 'transparent' }}>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{i+1}</td>
                          <td style={{ padding: '6px 8px' }}><span style={{ color: typeColor, fontSize: 11, fontWeight: 700 }}>{p.type}</span></td>
                          <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{a?.name ?? '?'}</td>
                          <td style={{ padding: '6px 8px' }}><span className={`tag tag-${p.aChoice}`}>{p.aChoice[0].toUpperCase()}</span></td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{state.pendingRound!.snapshotBefore[a?.name ?? ''] ?? '?'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {isEditing
                              ? <input type="number" style={{ width: 70, padding: '3px 6px', background: 'var(--bg)', border: '1px solid var(--gold)', color: 'var(--gold)', fontFamily: 'inherit', fontSize: 12 }}
                                  value={editDeltas[p.pairingId]?.a ?? p.aDelta}
                                  onChange={e => setEditDeltas(prev => ({...prev, [p.pairingId]: {...(prev[p.pairingId] || {a:String(p.aDelta),b:String(p.bDelta)}), a: e.target.value}}))} />
                              : <span style={{ color: p.aDelta > 0 ? 'var(--green)' : p.aDelta < 0 ? 'var(--hawk)' : 'var(--text-dim)', fontWeight: 500 }}>
                                  {p.aDelta > 0 ? '+' : ''}{p.aDelta} → <span style={{ color: 'var(--gold)' }}>{aAfter}</span>
                                </span>
                            }
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{isSitsOut ? '(sits out)' : b?.name ?? '?'}</td>
                          <td style={{ padding: '6px 8px' }}>{!isSitsOut && <span className={`tag tag-${p.bChoice}`}>{p.bChoice[0].toUpperCase()}</span>}</td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)' }}>{!isSitsOut && (state.pendingRound!.snapshotBefore[b?.name ?? ''] ?? '?')}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {!isSitsOut && (isEditing
                              ? <input type="number" style={{ width: 70, padding: '3px 6px', background: 'var(--bg)', border: '1px solid var(--gold)', color: 'var(--gold)', fontFamily: 'inherit', fontSize: 12 }}
                                  value={editDeltas[p.pairingId]?.b ?? p.bDelta}
                                  onChange={e => setEditDeltas(prev => ({...prev, [p.pairingId]: {...(prev[p.pairingId] || {a:String(p.aDelta),b:String(p.bDelta)}), b: e.target.value}}))} />
                              : <span style={{ color: p.bDelta > 0 ? 'var(--green)' : p.bDelta < 0 ? 'var(--hawk)' : 'var(--text-dim)', fontWeight: 500 }}>
                                  {p.bDelta > 0 ? '+' : ''}{p.bDelta} → <span style={{ color: 'var(--gold)' }}>{bAfter}</span>
                                </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', color: 'var(--text-dim)', fontSize: 11, maxWidth: 200 }}>{p.note}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {!isSitsOut && (isEditing
                              ? <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-gold" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => updateDelta(p.pairingId)}>Save</button>
                                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setEditDeltas(prev => { const n={...prev}; delete n[p.pairingId]; return n })}>✕</button>
                                </div>
                              : <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => setEditDeltas(prev => ({...prev, [p.pairingId]: {a:String(p.aDelta),b:String(p.bDelta)}}))}>Edit</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          {state.rounds.length === 0
            ? <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No finalized rounds yet.</div>
            : [...state.rounds].reverse().map(r => (
              <div key={r.round} className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Round {r.round} — Week {r.week}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Finalized {r.finalizedAt ? new Date(r.finalizedAt).toLocaleString() : '—'}
                      {' · '}{r.pairings.filter(p => p.aId !== p.bId).length} matchups
                      {' · '}<span style={{ color: 'var(--hawk)' }}>{r.pairings.filter(p=>p.type==='H+H').length} H+H</span>
                      {' · '}<span style={{ color: 'var(--dove)' }}>{r.pairings.filter(p=>p.type==='H+D').length} H+D</span>
                      {' · '}<span style={{ color: 'var(--green)' }}>{r.pairings.filter(p=>p.type==='D+D').length} D+D</span>
                      {r.pairings.some(p=>p.type==='STAPLED') && <span style={{ color: 'var(--gold)' }}>{' · '}{r.pairings.filter(p=>p.type==='STAPLED').length} Stapled</span>}
                    </div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Type','Player A','Choice','Before','Delta','After','Player B','Choice','Before','Delta','After','Note'].map(h => (
                          <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 400, fontSize: 10, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.pairings.map((p, i) => {
                        const a = state.students.find(s => s.id === p.aId)
                        const b = state.students.find(s => s.id === p.bId)
                        const aBefore = r.snapshotBefore[a?.name ?? ''] ?? 0
                        const bBefore = r.snapshotBefore[b?.name ?? ''] ?? 0
                        const aAfter = r.snapshotAfter[a?.name ?? ''] ?? 0
                        const bAfter = r.snapshotAfter[b?.name ?? ''] ?? 0
                        const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--green)':p.type==='STAPLED'?'var(--gold)':'var(--dove)'
                        const isSitsOut = p.aId === p.bId
                        return (
                          <tr key={p.pairingId} style={{ borderBottom: '1px solid rgba(26,32,48,0.8)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '5px 8px' }}><span style={{ color: tc, fontWeight: 700 }}>{p.type}</span></td>
                            <td style={{ padding: '5px 8px', color: 'var(--text)' }}>{a?.name ?? '?'}</td>
                            <td style={{ padding: '5px 8px' }}><span className={`tag tag-${p.aChoice}`} style={{ fontSize: 9 }}>{p.aChoice[0].toUpperCase()}</span></td>
                            <td style={{ padding: '5px 8px', color: 'var(--text-dim)' }}>{aBefore}</td>
                            <td style={{ padding: '5px 8px', color: p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight: 500 }}>{p.aDelta>0?'+':''}{p.aDelta}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--gold)' }}>{aAfter}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--text)' }}>{isSitsOut ? '(sits out)' : b?.name ?? '?'}</td>
                            <td style={{ padding: '5px 8px' }}>{!isSitsOut && <span className={`tag tag-${p.bChoice}`} style={{ fontSize: 9 }}>{p.bChoice[0].toUpperCase()}</span>}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--text-dim)' }}>{!isSitsOut && bBefore}</td>
                            <td style={{ padding: '5px 8px', color: p.bDelta>0?'var(--green)':p.bDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight: 500 }}>{!isSitsOut && <>{p.bDelta>0?'+':''}{p.bDelta}</>}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--gold)' }}>{!isSitsOut && bAfter}</td>
                            <td style={{ padding: '5px 8px', color: 'var(--text-dim)', maxWidth: 220, fontSize: 10 }}>{p.note}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── INSIGHTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'insights' && <InsightsPanel students={state.students} rounds={state.rounds} />}
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: color || 'var(--gold)' }}>{value}</span>
    </div>
  )
}

function InsightsPanel({ students, rounds }: { students: Student[]; rounds: RoundRecord[] }) {
  const active = students.filter(s => !s.isEliminated)
  const hawks = active.filter(s => s.choice === 'hawk')
  const doves = active.filter(s => s.choice === 'dove')
  const sorted = [...active].sort((a,b) => b.points - a.points)
  const total = active.reduce((s,x) => s+x.points, 0)
  const avg = active.length ? Math.round(total / active.length) : 0
  const top = sorted[0]; const bottom = sorted[sorted.length - 1]

  const dovePts = doves.map(s => s.points)
  const hawkPts = hawks.map(s => s.points)
  const doveAvg = dovePts.length ? Math.round(dovePts.reduce((a,b)=>a+b,0)/dovePts.length) : 0
  const hawkAvg = hawkPts.length ? Math.round(hawkPts.reduce((a,b)=>a+b,0)/hawkPts.length) : 0
  const doveUnder400 = dovePts.length ? Math.round(dovePts.filter(p=>p<400).length/dovePts.length*100) : 0
  const hawkOver500 = hawkPts.length ? Math.round(hawkPts.filter(p=>p>500).length/hawkPts.length*100) : 0
  const maxPts = sorted[0]?.points || 1

  const quotes = [
    `${doveUnder400}% of doves have fewer than 400 points.`,
    `Hawks average ${hawkAvg} pts vs doves at ${doveAvg} pts.`,
    `${hawkOver500}% of hawks hold over 500 points.`,
    `Top ${Math.round(active.length * 0.2)} players control ${Math.round(sorted.slice(0,Math.ceil(active.length*0.2)).reduce((s,x)=>s+x.points,0)/total*100)}% of all points.`,
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Quote cards */}
      {quotes.map((q, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.1em' }}>INSIGHT {i+1}</div>
          <div style={{ fontSize: 16, color: 'var(--gold)', lineHeight: 1.5 }}>"{q}"</div>
        </div>
      ))}

      {/* Distribution */}
      <div className="card" style={{ padding: 16, gridColumn: '1/-1' }}>
        <div className="label" style={{ marginBottom: 12 }}>Choice distribution (current round)</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ flex: hawks.length, height: 24, background: 'var(--hawk-bg)', border: '1px solid var(--hawk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--hawk)', transition: 'flex 0.5s' }}>
            🦅 {hawks.length} Hawks ({active.length ? Math.round(hawks.length/active.length*100) : 0}%)
          </div>
          <div style={{ flex: doves.length || 0.01, height: 24, background: 'var(--dove-bg)', border: '1px solid var(--dove)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--dove)', transition: 'flex 0.5s' }}>
            🕊️ {doves.length} Doves ({active.length ? Math.round(doves.length/active.length*100) : 0}%)
          </div>
          <div style={{ flex: active.filter(s=>!s.choice).length || 0.01, height: 24, background: 'var(--bg-raised)', border: '1px solid var(--border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-dim)', transition: 'flex 0.5s' }}>
            — {active.filter(s=>!s.choice).length} no choice
          </div>
        </div>
      </div>

      {/* Points leaderboard bar chart */}
      <div className="card" style={{ padding: 16, gridColumn: '1/-1' }}>
        <div className="label" style={{ marginBottom: 12 }}>Points distribution — all players</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sorted.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 160, fontSize: 11, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
              <div style={{ flex: 1, height: 14, background: 'var(--bg-raised)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${(s.points / maxPts) * 100}%`,
                  background: s.choice === 'hawk' ? 'var(--hawk-bg)' : s.choice === 'dove' ? 'var(--dove-bg)' : 'var(--bg-raised)',
                  borderRight: `2px solid ${s.choice === 'hawk' ? 'var(--hawk)' : s.choice === 'dove' ? 'var(--dove)' : 'var(--border-hi)'}`,
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>{s.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="card" style={{ padding: 16 }}>
        <div className="label" style={{ marginBottom: 12 }}>Key stats</div>
        {[
          ['Total players', active.length],
          ['Total points in play', total],
          ['Average points', avg],
          ['Richest', `${top?.name?.split(',')[0] ?? '—'} (${top?.points ?? 0})`],
          ['Least points', `${bottom?.name?.split(',')[0] ?? '—'} (${bottom?.points ?? 0})`],
          ['Rounds played', rounds.length],
        ].map(([label, val]) => (
          <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <span style={{ color: 'var(--text-dim)' }}>{label}</span>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Round-by-round H vs D summary */}
      {rounds.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="label" style={{ marginBottom: 12 }}>Rounds summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Round','H+H','H+D','D+D','Stapled'].map(h => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 400, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map(r => (
                <tr key={r.round} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--text-mid)' }}>{r.round}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--hawk)' }}>{r.pairings.filter(p=>p.type==='H+H').length}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--dove)' }}>{r.pairings.filter(p=>p.type==='H+D').length}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--green)' }}>{r.pairings.filter(p=>p.type==='D+D').length}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--gold)' }}>{r.pairings.filter(p=>p.type==='STAPLED').length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
