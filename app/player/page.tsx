'use client'
import { useState, useEffect, useCallback } from 'react'

type Phase = 'lobby' | 'submit' | 'reveal' | 'resolved'
type Choice = 'hawk' | 'dove'

interface GamePublicState {
  week: 1 | 2
  roundNumber: number
  phase: Phase
  sessionStarted: boolean
  playerCount: number
  submittedCount: number
  adminMessage: string
  currentPairings: Pairing[]
  players: PublicPlayer[]
}

interface PublicPlayer {
  id: string
  name: string
  points: number
  isEliminated: boolean
  hasSubmitted?: boolean
  staplePairId?: string
}

interface Pairing {
  id: string
  playerAId: string
  playerBId: string
  choiceA?: Choice
  choiceB?: Choice
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

type Step = 'waiting' | 'join' | 'lobby' | 'submit' | 'submitted' | 'reveal' | 'eliminated' | 'staple_offer'

export default function PlayerPage() {
  const [step, setStep] = useState<Step>('waiting')
  const [gameState, setGameState] = useState<GamePublicState | null>(null)
  const [player, setPlayer] = useState<{ id: string; name: string; email: string; points: number; cardNumber: number; staplePairId?: string } | null>(null)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [myPairing, setMyPairing] = useState<Pairing | null>(null)
  const [stapleDecisionMade, setStapleDecisionMade] = useState(false)
  const [prevPoints, setPrevPoints] = useState<number | null>(null)
  const [pointsDelta, setPointsDelta] = useState<number | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/game', { cache: 'no-store' })
      const data: GamePublicState = await res.json()
      setGameState(data)

      // Sync player points from server
      if (player) {
        const serverPlayer = data.players.find(p => p.id === player.id)
        if (serverPlayer) {
          if (prevPoints !== null && serverPlayer.points !== prevPoints) {
            setPointsDelta(serverPlayer.points - prevPoints)
            setPrevPoints(serverPlayer.points)
            setTimeout(() => setPointsDelta(null), 3000)
          } else if (prevPoints === null) {
            setPrevPoints(serverPlayer.points)
          }
          setPlayer(prev => prev ? { ...prev, points: serverPlayer.points, staplePairId: serverPlayer.staplePairId } : prev)

          if (serverPlayer.isEliminated) {
            setStep('eliminated')
            return
          }
        }

        // Find my pairing
        if (data.phase === 'reveal' || data.phase === 'resolved') {
          const pairing = data.currentPairings.find(
            p => p.playerAId === player.id || p.playerBId === player.id
          )
          setMyPairing(pairing || null)
        }

        // Step transitions
        if (data.phase === 'lobby' && (step === 'submit' || step === 'submitted')) {
          setStep('lobby')
          setChoice(null)
        }
        if (data.phase === 'submit' && step === 'lobby') {
          setStep('submit')
        }
        if (data.phase === 'reveal' && step === 'submitted') {
          // Check if we're a dove who was hawk'd in week 2
          if (data.week === 2 && !stapleDecisionMade) {
            const pairing = data.currentPairings.find(
              p => (p.playerAId === player.id || p.playerBId === player.id) && !p.isStapled
            )
            if (pairing) {
              const iAmDove = (pairing.playerAId === player.id && pairing.choiceA === 'dove' && pairing.choiceB === 'hawk') ||
                              (pairing.playerBId === player.id && pairing.choiceB === 'dove' && pairing.choiceA === 'hawk')
              if (iAmDove && !player.staplePairId) {
                setStep('staple_offer')
                setMyPairing(pairing)
                return
              }
            }
          }
          setStep('reveal')
        }
        if (data.phase === 'reveal' && step === 'submit') {
          setStep('reveal')
        }
      }

      // Not joined yet
      if (!player) {
        if (!data.sessionStarted) setStep('waiting')
        else setStep('join')
      }
    } catch {
      // ignore
    }
  }, [player, step, prevPoints, stapleDecisionMade])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [poll])

  // Load player from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('hd_player')
    if (saved) {
      try {
        setPlayer(JSON.parse(saved))
        setStep('lobby')
      } catch { /* ignore */ }
    }
  }, [])

  async function handleJoin() {
    if (!name.trim() || !email.trim() || cardNumber === '') {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/player/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), cardNumber: Number(cardNumber) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      const p = { id: data.player.id, name: data.player.name, email: data.player.email, points: data.player.points, cardNumber: data.player.cardNumber }
      setPlayer(p)
      setPrevPoints(p.points)
      sessionStorage.setItem('hd_player', JSON.stringify(p))
      setStep('lobby')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!choice || !player) return
    setLoading(true)
    try {
      const res = await fetch('/api/player/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, choice }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setStep('submitted')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStaple(accept: boolean) {
    if (!player) return
    setStapleDecisionMade(true)
    await fetch('/api/player/staple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id, accept }),
    })
    setStep('reveal')
  }

  const myServerPlayer = gameState?.players.find(p => p.id === player?.id)

  // ── WAITING ──────────────────────────────────────────────────────────────
  if (step === 'waiting') {
    return (
      <Screen>
        <div className="text-center">
          <div className="font-mono text-xs mb-8" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
            HAWK / DOVE EXPERIMENT
          </div>
          <div className="relative inline-block mb-8">
            <div className="w-4 h-4 rounded-full blink mx-auto" style={{ background: 'var(--gold)' }} />
          </div>
          <h2 className="font-mono text-xl mb-3" style={{ color: 'var(--gold)' }}>WAITING FOR SESSION</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your instructor will open the session shortly.
          </p>
          <p className="font-mono text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
            Stand by — this page polls automatically.
          </p>
        </div>
      </Screen>
    )
  }

  // ── JOIN ─────────────────────────────────────────────────────────────────
  if (step === 'join') {
    return (
      <Screen>
        <div className="w-full max-w-sm">
          <div className="font-mono text-xs mb-8 text-center" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
            PLAYER REGISTRATION
          </div>
          <TitleLogo />
          <div className="mt-8 flex flex-col gap-3">
            <div>
              <label className="font-mono text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>YOUR NAME</label>
              <input className="input-field" placeholder="First Last" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>EMAIL</label>
              <input className="input-field" type="email" placeholder="you@school.edu" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="font-mono text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>CARD NUMBER (bottom-right corner)</label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setCardNumber(String(n))}
                    className="py-3 font-mono text-lg font-bold transition-all"
                    style={{
                      border: cardNumber === String(n) ? '1px solid var(--gold)' : '1px solid var(--border-bright)',
                      background: cardNumber === String(n) ? 'var(--gold-dim)' : 'var(--bg)',
                      color: cardNumber === String(n) ? 'var(--gold)' : 'var(--text-secondary)',
                      borderRadius: 2,
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
            {error && <p className="font-mono text-xs" style={{ color: 'var(--hawk)' }}>{error}</p>}
            <button
              className="btn-dove w-full py-4 mt-2"
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? 'JOINING...' : 'JOIN GAME →'}
            </button>
          </div>
        </div>
      </Screen>
    )
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────
  if (step === 'lobby') {
    return (
      <Screen>
        <div className="text-center w-full max-w-sm">
          <div className="font-mono text-xs mb-6" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            WEEK {gameState?.week} · ROUND {gameState?.roundNumber === 0 ? '—' : gameState?.roundNumber}
          </div>
          <div className="card p-6 mb-6">
            <div className="font-mono text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>YOUR BALANCE</div>
            <div className="font-mono text-4xl font-bold" style={{ color: 'var(--gold)' }}>
              {player?.points ?? '—'}
            </div>
            <div className="font-mono text-xs mt-1" style={{ color: 'var(--text-dim)' }}>pts · card #{player?.cardNumber}</div>
            {player?.staplePairId && (
              <div className="mt-3 font-mono text-xs px-3 py-2" style={{ background: 'var(--hawk-dim)', color: 'var(--hawk)', border: '1px solid var(--hawk-dim)' }}>
                📌 STAPLED — protective pair active
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-2 h-2 rounded-full blink" style={{ background: 'var(--dove)' }} />
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              {gameState?.playerCount ?? 0} players connected
            </span>
          </div>
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
            Waiting for instructor to start the round...
          </p>
          {gameState?.adminMessage && (
            <div className="mt-4 p-3 font-mono text-xs" style={{ border: '1px solid var(--border-bright)', color: 'var(--gold)' }}>
              {gameState.adminMessage}
            </div>
          )}
        </div>
      </Screen>
    )
  }

  // ── SUBMIT ───────────────────────────────────────────────────────────────
  if (step === 'submit') {
    return (
      <Screen>
        <div className="text-center w-full max-w-sm">
          <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            ROUND {gameState?.roundNumber} · MAKE YOUR MOVE
          </div>
          <div className="font-mono text-xs mb-8" style={{ color: 'var(--text-secondary)' }}>
            Balance: <span style={{ color: 'var(--gold)' }}>{player?.points} pts</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className={`btn-hawk py-10 flex flex-col items-center gap-3 ${choice === 'hawk' ? 'selected' : ''}`}
              onClick={() => setChoice('hawk')}
            >
              <span style={{ fontSize: 36 }}>🦅</span>
              <span>HAWK</span>
              <span className="text-xs font-normal opacity-70 normal-case" style={{ letterSpacing: 0 }}>Aggressive</span>
            </button>
            <button
              className={`btn-dove py-10 flex flex-col items-center gap-3 ${choice === 'dove' ? 'selected' : ''}`}
              onClick={() => setChoice('dove')}
            >
              <span style={{ fontSize: 36 }}>🕊️</span>
              <span>DOVE</span>
              <span className="text-xs font-normal opacity-70 normal-case" style={{ letterSpacing: 0 }}>Cooperative</span>
            </button>
          </div>

          {/* Payoff reminder */}
          <div className="card p-3 text-left mb-6">
            <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)' }}>PAYOFF MATRIX</div>
            <div className="font-mono text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div><span style={{ color: 'var(--dove)' }}>D+D</span> → Both gain +1–20 pts (random)</div>
              <div><span style={{ color: 'var(--hawk)' }}>H</span>+<span style={{ color: 'var(--dove)' }}>D</span> → Hawk takes 25% of Dove × 3</div>
              <div><span style={{ color: 'var(--hawk)' }}>H+H</span> → Higher card takes everything</div>
            </div>
          </div>

          {error && <p className="font-mono text-xs mb-3" style={{ color: 'var(--hawk)' }}>{error}</p>}

          <button
            className="btn-dove w-full py-4"
            onClick={handleSubmit}
            disabled={!choice || loading}
            style={{ opacity: !choice ? 0.4 : 1 }}
          >
            {loading ? 'LOCKING IN...' : choice ? `LOCK IN ${choice.toUpperCase()} →` : 'SELECT A STRATEGY'}
          </button>
        </div>
      </Screen>
    )
  }

  // ── SUBMITTED ────────────────────────────────────────────────────────────
  if (step === 'submitted') {
    return (
      <Screen>
        <div className="text-center">
          <div className="font-mono text-xs mb-8" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>CHOICE LOCKED</div>
          <div className={`text-6xl mb-6 ${choice === 'hawk' ? 'hawk-text' : 'dove-text'}`}>
            {choice === 'hawk' ? '🦅' : '🕊️'}
          </div>
          <h2 className={`font-mono text-2xl font-bold mb-2 ${choice === 'hawk' ? 'hawk-text' : 'dove-text'}`}>
            {choice?.toUpperCase()} SUBMITTED
          </h2>
          <p className="font-mono text-xs mb-8" style={{ color: 'var(--text-secondary)' }}>
            Waiting for all players...
          </p>
          <div className="card p-4">
            <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)' }}>SUBMISSIONS</div>
            <div className="font-mono text-2xl font-bold" style={{ color: 'var(--gold)' }}>
              {gameState?.submittedCount} <span className="text-sm" style={{ color: 'var(--text-dim)' }}>/ {gameState?.playerCount}</span>
            </div>
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full transition-all duration-500" style={{
                background: 'var(--dove)',
                width: `${gameState ? (gameState.submittedCount / gameState.playerCount) * 100 : 0}%`
              }} />
            </div>
          </div>
        </div>
      </Screen>
    )
  }

  // ── STAPLE OFFER (Week 2) ─────────────────────────────────────────────────
  if (step === 'staple_offer' && myPairing) {
    const hawkId = myPairing.choiceA === 'hawk' ? myPairing.playerAId : myPairing.playerBId
    const hawk = gameState?.players.find(p => p.id === hawkId)
    return (
      <Screen>
        <div className="text-center w-full max-w-sm">
          <div className="font-mono text-xs mb-6" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>WEEK 2 · PROTECTIVE PAIR OFFER</div>
          <div className="text-5xl mb-4">📌</div>
          <h2 className="font-mono text-xl font-bold mb-3" style={{ color: 'var(--gold)' }}>STAPLE OPTION</h2>
          <div className="card p-4 mb-6 text-left">
            <p className="font-mono text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              You were just exploited by <span style={{ color: 'var(--hawk)' }}>{hawk?.name ?? 'the hawk player'}</span>.
            </p>
            <p className="font-mono text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              You can <strong style={{ color: 'var(--gold)' }}>staple</strong> to them: you'll always pay 25% tax each round (×3 to them), but they <em>may</em> choose to return some points to you.
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              Declining means you re-enter the random pool next round.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-hawk py-4" onClick={() => handleStaple(true)}>
              📌 STAPLE<br /><span className="text-xs font-normal" style={{ letterSpacing: 0 }}>Accept pairing</span>
            </button>
            <button className="btn-dove py-4" onClick={() => handleStaple(false)}>
              ↩ DECLINE<br /><span className="text-xs font-normal" style={{ letterSpacing: 0 }}>Random pool</span>
            </button>
          </div>
        </div>
      </Screen>
    )
  }

  // ── REVEAL ───────────────────────────────────────────────────────────────
  if (step === 'reveal') {
    const newPoints = myServerPlayer?.points ?? player?.points ?? 0
    const delta = pointsDelta

    return (
      <Screen>
        <div className="text-center w-full max-w-sm slide-up">
          <div className="font-mono text-xs mb-6" style={{ color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            ROUND {gameState?.roundNumber} · RESULTS
          </div>

          {/* Points display */}
          <div className={`card p-6 mb-6 ${delta !== null ? (delta >= 0 ? 'flash-gain' : 'flash-loss') : ''}`}>
            <div className="font-mono text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>YOUR BALANCE</div>
            <div className="font-mono text-5xl font-bold" style={{ color: 'var(--gold)' }}>{newPoints}</div>
            {delta !== null && (
              <div className="font-mono text-lg font-bold mt-1" style={{ color: delta >= 0 ? '#4caf50' : 'var(--hawk)' }}>
                {delta >= 0 ? '+' : ''}{delta} pts
              </div>
            )}
          </div>

          {/* My pairing result */}
          {myPairing?.result && (
            <div className="card p-4 text-left mb-6">
              <div className="font-mono text-xs mb-2" style={{ color: 'var(--text-dim)' }}>YOUR MATCHUP</div>
              <div className="flex gap-3 mb-3">
                {[
                  { id: myPairing.playerAId, choice: myPairing.choiceA },
                  { id: myPairing.playerBId, choice: myPairing.choiceB },
                ].map(side => {
                  const p = gameState?.players.find(pl => pl.id === side.id)
                  const isMe = side.id === player?.id
                  return (
                    <div key={side.id} className="flex-1 p-2 text-center" style={{
                      border: `1px solid ${isMe ? 'var(--gold)' : 'var(--border)'}`,
                      background: isMe ? 'var(--gold-dim)' : 'var(--bg)',
                    }}>
                      <div className="font-mono text-xs" style={{ color: isMe ? 'var(--gold)' : 'var(--text-dim)' }}>
                        {isMe ? 'YOU' : p?.name ?? '?'}
                      </div>
                      <div className={`font-mono text-sm font-bold mt-1 ${side.choice === 'hawk' ? 'hawk-text' : 'dove-text'}`}>
                        {side.choice === 'hawk' ? '🦅' : '🕊️'} {side.choice?.toUpperCase()}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                {myPairing.result.summary}
              </p>
            </div>
          )}

          {myPairing?.isStapled && (
            <div className="card p-4 mb-6">
              <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                📌 Stapled pair — standard 25% redistribution applied.
              </div>
            </div>
          )}

          <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
            Waiting for next round...
          </div>
        </div>
      </Screen>
    )
  }

  // ── ELIMINATED ───────────────────────────────────────────────────────────
  if (step === 'eliminated') {
    return (
      <Screen>
        <div className="text-center">
          <div className="text-6xl mb-6">💀</div>
          <h2 className="font-mono text-2xl font-bold mb-3 hawk-text">ELIMINATED</h2>
          <p className="font-mono text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Your points reached zero.</p>
          <p className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
            Watch the projector to see how the game ends.
          </p>
        </div>
      </Screen>
    )
  }

  return <Screen><div className="font-mono text-sm" style={{ color: 'var(--text-dim)' }}>Loading...</div></Screen>
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 left-4 font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
        H/D
      </div>
      {children}
    </main>
  )
}

function TitleLogo() {
  return (
    <div className="text-center">
      <div className="font-mono text-3xl font-bold">
        <span style={{ color: 'var(--hawk)' }}>HAWK</span>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span style={{ color: 'var(--dove)' }}>DOVE</span>
      </div>
    </div>
  )
}
