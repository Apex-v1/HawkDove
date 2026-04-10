'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 80)
    return () => clearInterval(interval)
  }, [])

  const chars = '▓▒░ HAWKDOVE01'
  const glitch = chars[tick % chars.length]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(30,40,50,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,40,50,0.4) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
        ECON_LAB // SESSION_NODE_01
      </div>
      <div className="absolute top-6 right-6 font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
        {new Date().toLocaleTimeString('en-US', { hour12: false })} UTC
      </div>

      {/* Title */}
      <div className="relative z-10 text-center mb-16">
        <div className="font-mono text-xs mb-6" style={{ color: 'var(--text-dim)', letterSpacing: '0.3em' }}>
          SOCIAL REDISTRIBUTION EXPERIMENT
        </div>

        <div className="relative mb-2">
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(48px, 10vw, 96px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            <span style={{ color: 'var(--hawk)' }}>HAWK</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.4em', verticalAlign: 'middle', margin: '0 12px' }}>/</span>
            <span style={{ color: 'var(--dove)' }}>DOVE</span>
          </h1>
          {/* Glitch char */}
          <span className="absolute font-mono text-xs" style={{
            color: 'var(--text-dim)',
            right: '-24px',
            bottom: '8px',
          }}>{glitch}</span>
        </div>

        <div className="font-mono text-sm mt-4" style={{ color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>
          A GAME THEORY EXPERIMENT
        </div>
      </div>

      {/* Buttons */}
      <div className="relative z-10 flex flex-col gap-4 w-full max-w-xs px-6">
        <button
          className="btn-dove w-full py-4 text-sm"
          onClick={() => router.push('/player')}
        >
          ▶ ENTER AS PLAYER
        </button>
        <button
          className="btn-primary w-full py-3 text-xs"
          onClick={() => router.push('/admin')}
          style={{ opacity: 0.6 }}
        >
          ⬡ ADMIN PANEL
        </button>
      </div>

      {/* Ticker */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden font-mono text-xs py-2"
        style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <span className="ticker-text">
          HAWK EXPLOITS · DOVE COOPERATES · HAWK vs HAWK: CONFLICT · DOVE vs DOVE: MUTUAL GAIN · CHOOSE WISELY · THE MARKET REWARDS AGGRESSION · OR DOES IT? · GAME THEORY · REDISTRIBUTION · SOCIAL CONTRACT · WHO DO YOU TRUST? · &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </span>
      </div>
    </main>
  )
}
