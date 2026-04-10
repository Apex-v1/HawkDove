'use client'
import { useState, useEffect, useCallback } from 'react'

interface PublicPlayer {
  id: string
  name: string
  points: number
  isEliminated: boolean
  hasSubmitted?: boolean
  staplePairId?: string
  cardNumber?: number
}

interface Pairing {
  id: string
  playerAId: string
  playerBId: string
  choiceA?: string
  choiceB?: string
  resolved: boolean
  isStapled?: boolean
  result?: {
    playerAPointsDelta: number
    playerBPointsDelta: number
    summary: string
    diceRoll?: number
    coinFlip?: string
  }
}

interface GameState {
  week: 1 | 2
  roundNumber: number
  phase: string
  sessionStarted: boolean
  playerCount: number
  submittedCount: number
  adminMessage: string
  currentPairings: Pairing[]
  players: PublicPlayer[]
}

export default function DisplayPage() {
  const [state, setState] = useState<GameState | null>(null)
  const [prevPoints, setPrevPoints] = useState<Record<string, number>>({})
  const [deltas, setDeltas] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(i)
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/game', { cache: 'no-store' })
      const data: GameState = await res.json()

      // Compute deltas
      if (data.phase === 'reveal' || data.phase === 'resolved') {
        const newDeltas: Record<string, number> = {}
        data.players.forEach(p => {
          if (prevPoints[p.id] !== undefined && prevPoints[p.id] !== p.points) {
            newDeltas[p.id] = p.points - prevPoints[p.id]
          }
        })
        if (Object.keys(newDeltas).length > 0) {
          setDeltas(newDeltas)
          setTimeout(() => setDeltas({}), 4000)
        }
        const newPrev: Record<string, number> = {}
        data.players.forEach(p => { newPrev[p.id] = p.points })
        setPrevPoints(newPrev)
      }

      setState(data)
    } catch { /* ignore */ }
  }, [prevPoints])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [poll])

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-sm blink" style={{ color: 'var(--text-dim)' }}>Connecting...</div>
      </main>
    )
  }

  const activePlayers = state.players.filter(p => !p.isEliminated)
  const sortedPlayers = [...activePlayers].sort((a, b) => b.points - a.points)
  const maxPoints = Math.max(...sortedPlayers.map(p => p.points), 1)

  return (
    <main className="min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="font-mono text-2xl font-bold">
          <span style={{ color: 'var(--hawk)' }}>HAWK</span>
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          <span style={{ color: 'var(--dove)' }}>DOVE</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>WEEK</div>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--gold)' }}>{state.week}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>ROUND</div>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--gold)' }}>{state.roundNumber || '—'}</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>PLAYERS</div>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--gold)' }}>{activePlayers.length}</div>
          </div>
          <PhaseTag phase={state.phase} />
        </div>

        <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
          {String(Math.floor(tick / 3600)).padStart(2, '0')}:{String(Math.floor((tick % 3600) / 60)).padStart(2, '0')}:{String(tick % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Admin message banner */}
      {state.adminMessage && (
        <div className="px-8 py-2 font-mono text-sm text-center" style={{
          background: 'var(--gold-dim)',
          color: 'var(--gold)',
          borderBottom: '1px solid var(--gold-dim)'
        }}>
          {state.adminMessage}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Leaderboard */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="font-mono text-xs mb-4" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>STANDINGS</div>

          {/* Submission progress */}
          {state.phase === 'submit' && (
            <div className="card p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>AWAITING SUBMISSIONS</span>
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--dove)' }}>
                  {state.submittedCount} / {state.playerCount}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full transition-all duration-500" style={{
                  background: 'linear-gradient(90deg, var(--dove), var(--hawk))',
                  width: `${state.playerCount > 0 ? (state.submittedCount / state.playerCount) * 100 : 0}%`
                }} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {sortedPlayers.map((player, i) => {
              const delta = deltas[player.id]
              const barWidth = (player.points / maxPoints) * 100
              return (
                <div key={player.id} className={`relative ${delta !== undefined ? (delta >= 0 ? 'flash-gain' : 'flash-loss') : ''}`}
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '10px 14px' }}>
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="font-mono text-sm w-6 text-center flex-shrink-0" style={{
                      color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-dim)'
                    }}>
                      {i === 0 ? '★' : `${i + 1}`}
                    </span>
                    <span className="font-mono text-sm font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {player.name}
                      {player.staplePairId ? <span className="ml-2 text-xs" style={{ color: 'var(--hawk)' }}>📌</span> : ''}
                    </span>
                    {state.phase === 'submit' && player.hasSubmitted && (
                      <span className="font-mono text-xs" style={{ color: '#4caf50' }}>✓</span>
                    )}
                    {delta !== undefined && (
                      <span className="font-mono text-sm font-bold" style={{ color: delta >= 0 ? '#4caf50' : 'var(--hawk)' }}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    )}
                    <span className="font-mono text-base font-bold" style={{ color: 'var(--gold)', minWidth: 60, textAlign: 'right' }}>
                      {player.points}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-700" style={{
                    width: `${barWidth}%`,
                    background: i === 0 ? 'var(--gold)' : 'var(--border-bright)',
                  }} />
                </div>
              )
            })}

            {/* Eliminated */}
            {state.players.filter(p => p.isEliminated).length > 0 && (
              <div className="mt-2">
                <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)' }}>ELIMINATED</div>
                {state.players.filter(p => p.isEliminated).map(p => (
                  <div key={p.id} className="flex justify-between px-3 py-1 font-mono text-xs" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>
                    <span>💀 {p.name}</span>
                    <span>0</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Pairings / Results */}
        {(state.phase === 'reveal' || state.phase === 'resolved') && state.currentPairings.length > 0 && (
          <div className="w-80 p-6 overflow-y-auto" style={{ borderLeft: '1px solid var(--border)' }}>
            <div className="font-mono text-xs mb-4" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
              ROUND {state.roundNumber} RESULTS
            </div>
            <div className="flex flex-col gap-3">
              {state.currentPairings.map(p => {
                const pA = state.players.find(pl => pl.id === p.playerAId)
                const pB = state.players.find(pl => pl.id === p.playerBId)
                return (
                  <div key={p.id} className="card-elevated p-3 slide-up">
                    {p.isStapled && (
                      <div className="font-mono text-xs mb-1" style={{ color: 'var(--hawk)' }}>📌 STAPLED</div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <ChoiceChip name={pA?.name} choice={p.choiceA} delta={deltas[p.playerAId]} />
                      <div className="font-mono text-xs self-center" style={{ color: 'var(--text-dim)' }}>vs</div>
                      <ChoiceChip name={pB?.name} choice={p.choiceB} delta={deltas[p.playerBId]} />
                    </div>
                    {p.result && (
                      <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {p.result.summary}
                      </p>
                    )}
                    {p.result?.diceRoll && (
                      <div className="mt-1 font-mono text-xs" style={{ color: 'var(--dove)' }}>
                        🎲 Rolled {p.result.diceRoll}
                      </div>
                    )}
                    {p.result?.coinFlip && (
                      <div className="mt-1 font-mono text-xs" style={{ color: 'var(--gold)' }}>
                        🪙 Coin: {p.result.coinFlip}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Lobby waiting state */}
        {state.phase === 'lobby' && (
          <div className="w-80 p-6 flex flex-col items-center justify-center" style={{ borderLeft: '1px solid var(--border)' }}>
            <div className="text-center">
              <div className="font-mono text-4xl mb-4">
                <span style={{ color: 'var(--hawk)' }}>🦅</span>
                <span style={{ color: 'var(--dove)' }}>🕊️</span>
              </div>
              <div className="font-mono text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                {state.sessionStarted ? 'Join at:' : 'Session closed'}
              </div>
              {state.sessionStarted && (
                <div className="font-mono text-lg font-bold" style={{ color: 'var(--gold)' }}>
                  [your-url]/player
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 justify-center">
                <div className="w-2 h-2 rounded-full blink" style={{
                  background: state.sessionStarted ? '#4caf50' : 'var(--text-dim)'
                }} />
                <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                  {activePlayers.length} players connected
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticker */}
      <div className="overflow-hidden font-mono text-xs py-2" style={{
        color: 'var(--text-dim)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)'
      }}>
        <span className="ticker-text">
          HAWK EXPLOITS · DOVE COOPERATES · H+H: WINNER TAKES ALL · D+D: MUTUAL GAIN +1–20 · H+D: HAWK TAKES 25%×3 · HIGHER CARD NUMBER WINS H+H CONFLICTS · COIN FLIP ON TIE · &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      </div>
    </main>
  )
}

function PhaseTag({ phase }: { phase: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    lobby: { color: 'var(--text-secondary)', label: 'LOBBY' },
    submit: { color: 'var(--dove)', label: 'SUBMITTING' },
    reveal: { color: 'var(--gold)', label: 'REVEAL' },
    resolved: { color: 'var(--hawk)', label: 'GAME OVER' },
  }
  const cfg = configs[phase] || { color: 'var(--text-dim)', label: phase.toUpperCase() }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5" style={{ border: `1px solid ${cfg.color}` }}>
      <div className="w-2 h-2 rounded-full blink" style={{ background: cfg.color }} />
      <span className="font-mono text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

function ChoiceChip({ name, choice, delta }: { name?: string; choice?: string; delta?: number }) {
  return (
    <div className="flex-1 p-2 text-center" style={{
      border: `1px solid ${choice === 'hawk' ? 'var(--hawk-dim)' : choice === 'dove' ? 'var(--dove-dim)' : 'var(--border)'}`,
      background: 'var(--bg)',
    }}>
      <div className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{name ?? '?'}</div>
      {choice && (
        <div className={`font-mono text-sm font-bold mt-1 ${choice === 'hawk' ? 'hawk-text' : 'dove-text'}`}>
          {choice === 'hawk' ? '🦅' : '🕊️'}
        </div>
      )}
      {delta !== undefined && (
        <div className="font-mono text-xs" style={{ color: delta >= 0 ? '#4caf50' : 'var(--hawk)' }}>
          {delta >= 0 ? '+' : ''}{delta}
        </div>
      )}
    </div>
  )
}
