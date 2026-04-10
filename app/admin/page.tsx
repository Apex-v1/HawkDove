'use client'
import { useState, useEffect, useCallback } from 'react'

interface Player {
  id: string
  name: string
  email: string
  points: number
  cardNumber: number
  playHistory: ('red' | 'black')[]
  choice?: string
  hasSubmitted: boolean
  isEliminated: boolean
  staplePairId?: string
  isHawkInStaple?: boolean
  stapleRound?: number
}

interface Pairing {
  id: string
  playerAId: string
  playerBId: string
  choiceA?: string
  choiceB?: string
  resolved: boolean
  isStapled?: boolean
  result?: { playerAPointsDelta: number; playerBPointsDelta: number; summary: string; diceRoll?: number; coinFlip?: string }
}

interface GameState {
  week: 1 | 2
  roundNumber: number
  phase: string
  sessionStarted: boolean
  players: Player[]
  currentPairings: Pairing[]
  adminMessage: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [state, setState] = useState<GameState | null>(null)
  const [msg, setMsg] = useState('')
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState('')

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/control', { cache: 'no-store' })
      if (res.status === 401) { setAuthed(false); return }
      const data = await res.json()
      setState(data.state)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchState()
    const interval = setInterval(fetchState, 2000)
    return () => clearInterval(interval)
  }, [authed, fetchState])

  async function login() {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true); setAuthError('') }
    else setAuthError('Invalid password')
  }

  async function action(act: string, payload: Record<string, unknown> = {}) {
    setLoading(act)
    try {
      const res = await fetch('/api/admin/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act, payload }),
      })
      const data = await res.json()
      if (data.state) setState(data.state)
    } finally {
      setLoading('')
    }
  }

  async function sendMessage() {
    await action('set_message', { message: msg })
    setMsg('')
  }

  async function doTransfer(hawkId: string) {
    const amt = Number(transferAmounts[hawkId] || 0)
    if (!amt) return
    await action('hawk_transfer', { hawkId, amount: amt })
    setTransferAmounts(prev => ({ ...prev, [hawkId]: '' }))
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-xs">
          <div className="font-mono text-xs mb-6 text-center" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
            ADMIN ACCESS
          </div>
          <div className="font-mono text-2xl font-bold text-center mb-8">
            <span style={{ color: 'var(--hawk)' }}>HAWK</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span style={{ color: 'var(--dove)' }}>DOVE</span>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              className="input-field"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
            />
            {authError && <p className="font-mono text-xs" style={{ color: 'var(--hawk)' }}>{authError}</p>}
            <button className="btn-dove w-full py-3" onClick={login}>AUTHENTICATE →</button>
          </div>
        </div>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm blink" style={{ color: 'var(--text-dim)' }}>Loading state...</div>
      </main>
    )
  }

  const activePlayers = state.players.filter(p => !p.isEliminated)
  const submitted = state.players.filter(p => p.hasSubmitted && !p.isEliminated).length
  const stapledPlayers = activePlayers.filter(p => p.staplePairId && p.isHawkInStaple)
  const topPlayers = [...state.players].sort((a, b) => b.points - a.points).slice(0, 5)

  return (
    <main className="min-h-screen p-4 md:p-6" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="font-mono text-xs mb-1" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>ADMIN PANEL</div>
          <div className="font-mono text-xl font-bold">
            <span style={{ color: 'var(--hawk)' }}>HAWK</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span style={{ color: 'var(--dove)' }}>DOVE</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge phase={state.phase} />
          <button className="btn-danger" onClick={() => { if (confirm('Reset entire game?')) action('reset') }}>RESET</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ── LEFT COLUMN: Controls ── */}
        <div className="flex flex-col gap-4">
          {/* Status */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>STATUS</div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <Stat label="WEEK" value={state.week} />
              <Stat label="ROUND" value={state.roundNumber || '—'} />
              <Stat label="PLAYERS" value={activePlayers.length} />
            </div>
          </div>

          {/* Week toggle */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>GAME MODE</div>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map(w => (
                <button
                  key={w}
                  className="py-2 font-mono text-sm font-bold transition-all"
                  onClick={() => action('set_week', { week: w })}
                  style={{
                    border: `1px solid ${state.week === w ? 'var(--gold)' : 'var(--border-bright)'}`,
                    background: state.week === w ? 'var(--gold-dim)' : 'var(--bg)',
                    color: state.week === w ? 'var(--gold)' : 'var(--text-secondary)',
                  }}
                >
                  WEEK {w}
                </button>
              ))}
            </div>
          </div>

          {/* Session control */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>SESSION</div>
            <div className="flex flex-col gap-2">
              <button
                className={state.sessionStarted ? 'btn-danger' : 'btn-dove'}
                style={{ padding: '10px 0', fontSize: 12 }}
                onClick={() => action(state.sessionStarted ? 'close_session' : 'open_session')}
              >
                {state.sessionStarted ? '⬛ CLOSE SESSION' : '▶ OPEN SESSION'}
              </button>
              {state.sessionStarted && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full blink" style={{ background: '#4caf50' }} />
                  <span className="font-mono text-xs" style={{ color: '#4caf50' }}>Open — students can join</span>
                </div>
              )}
            </div>
          </div>

          {/* Round controls */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>ROUND CONTROLS</div>
            <div className="flex flex-col gap-2">
              <button
                className="btn-dove"
                style={{ padding: '10px 0', fontSize: 12 }}
                onClick={() => action('start_round')}
                disabled={state.phase === 'submit' || !state.sessionStarted}
              >
                {loading === 'start_round' ? '...' : '▶ START ROUND'}
              </button>
              <button
                className="btn-hawk"
                style={{ padding: '10px 0', fontSize: 12 }}
                onClick={() => action('resolve_round')}
                disabled={state.phase !== 'submit'}
              >
                {loading === 'resolve_round' ? '...' : '⚡ RESOLVE + REVEAL'}
              </button>
            </div>

            {state.phase === 'submit' && (
              <div className="mt-3">
                <div className="font-mono text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Submitted: {submitted} / {activePlayers.length}
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full transition-all" style={{
                    background: 'var(--dove)',
                    width: `${activePlayers.length > 0 ? (submitted / activePlayers.length) * 100 : 0}%`
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Admin message */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>BROADCAST MESSAGE</div>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Message to players..."
                value={msg}
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button className="btn-primary px-3" onClick={sendMessage}>→</button>
            </div>
            {state.adminMessage && (
              <div className="mt-2 font-mono text-xs" style={{ color: 'var(--gold)' }}>
                Active: &quot;{state.adminMessage}&quot;
                <button className="ml-2" style={{ color: 'var(--text-dim)' }} onClick={() => action('set_message', { message: '' })}>✕</button>
              </div>
            )}
          </div>

          {/* Display link */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>PROJECTOR</div>
            <a href="/display" target="_blank" className="font-mono text-xs" style={{ color: 'var(--dove)' }}>
              Open /display in new tab →
            </a>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: Pairings + Current round ── */}
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
              ROUND {state.roundNumber} · PAIRINGS
            </div>
            {state.currentPairings.length === 0 ? (
              <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>No active pairings.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                {state.currentPairings.map(p => {
                  const pA = state.players.find(pl => pl.id === p.playerAId)
                  const pB = state.players.find(pl => pl.id === p.playerBId)
                  return (
                    <div key={p.id} className="card-elevated p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs" style={{ color: p.isStapled ? 'var(--hawk)' : 'var(--text-secondary)' }}>
                          {p.isStapled ? '📌 STAPLED' : `#${state.currentPairings.indexOf(p) + 1}`}
                        </span>
                        {p.resolved && <span className="font-mono text-xs" style={{ color: '#4caf50' }}>✓ resolved</span>}
                      </div>
                      <div className="flex gap-2">
                        <PlayerChip player={pA} choice={p.choiceA} isRevealed={p.resolved} />
                        <div className="font-mono text-xs self-center" style={{ color: 'var(--text-dim)' }}>VS</div>
                        <PlayerChip player={pB} choice={p.choiceB} isRevealed={p.resolved} />
                      </div>
                      {p.result && (
                        <div className="mt-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.result.summary}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Week 2: Stapled pairs management */}
          {state.week === 2 && stapledPlayers.length > 0 && (
            <div className="card p-4">
              <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
                📌 STAPLED PAIRS — HAWK TRANSFERS
              </div>
              <div className="flex flex-col gap-3">
                {stapledPlayers.map(hawk => {
                  const dove = state.players.find(p => p.id === hawk.staplePairId)
                  if (!dove) return null
                  return (
                    <div key={hawk.id} className="card-elevated p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-mono text-xs hawk-text">🦅 {hawk.name} ({hawk.points}pts)</span>
                        <span className="font-mono text-xs dove-text">🕊️ {dove.name} ({dove.points}pts)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="input-field flex-1"
                          type="number"
                          placeholder="Transfer amount"
                          value={transferAmounts[hawk.id] || ''}
                          onChange={e => setTransferAmounts(prev => ({ ...prev, [hawk.id]: e.target.value }))}
                        />
                        <button className="btn-primary px-3 text-xs" onClick={() => doTransfer(hawk.id)}>
                          XFER →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Leaderboard + Players ── */}
        <div className="flex flex-col gap-4">
          {/* Top 5 */}
          <div className="card p-4">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>LEADERBOARD</div>
            <div className="flex flex-col gap-1">
              {topPlayers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-xs w-4" style={{ color: i === 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
                    {i === 0 ? '★' : `${i + 1}`}
                  </span>
                  <span className="font-mono text-xs flex-1" style={{ color: p.isEliminated ? 'var(--text-dim)' : 'var(--text-primary)' }}>
                    {p.name}{p.staplePairId ? ' 📌' : ''}
                    {p.isEliminated ? ' 💀' : ''}
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>{p.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* All players */}
          <div className="card p-4 flex-1">
            <div className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
              ALL PLAYERS ({state.players.length})
            </div>
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
              {[...state.players].sort((a,b) => b.points - a.points).map(p => (
                <div key={p.id} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)', opacity: p.isEliminated ? 0.4 : 1 }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${state.phase === 'submit' ? (p.hasSubmitted ? 'bg-green-500' : 'blink') : ''}`}
                    style={{ background: p.isEliminated ? 'var(--text-dim)' : state.phase === 'submit' ? undefined : 'var(--dove)' }} />
                  <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>#{p.cardNumber}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>{p.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatusBadge({ phase }: { phase: string }) {
  const colors: Record<string, string> = {
    lobby: 'var(--text-secondary)',
    submit: 'var(--dove)',
    reveal: 'var(--gold)',
    resolved: 'var(--hawk)',
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5" style={{ border: `1px solid ${colors[phase] || 'var(--border)'}` }}>
      <div className="w-1.5 h-1.5 rounded-full blink" style={{ background: colors[phase] }} />
      <span className="font-mono text-xs" style={{ color: colors[phase] }}>{phase.toUpperCase()}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color: 'var(--gold)' }}>{value}</div>
    </div>
  )
}

function PlayerChip({ player, choice, isRevealed }: { player?: { name: string; points: number }; choice?: string; isRevealed: boolean }) {
  return (
    <div className="flex-1 p-2 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{player?.name ?? '?'}</div>
      <div className="font-mono text-xs" style={{ color: 'var(--gold)' }}>{player?.points}pts</div>
      {isRevealed && choice && (
        <div className={`font-mono text-xs font-bold mt-1 ${choice === 'hawk' ? 'hawk-text' : 'dove-text'}`}>
          {choice === 'hawk' ? '🦅' : '🕊️'}
        </div>
      )}
    </div>
  )
}
