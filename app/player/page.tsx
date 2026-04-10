'use client'
import { useState, useEffect, useCallback } from 'react'

interface StudentInfo {
  id: string; name: string; email: string; points: number; tiebreaker: number
  hasChosen: boolean; choice?: string; isEliminated: boolean
  staplePartnerId?: string; isHawkInStaple?: boolean
}
interface Pairing {
  pairingId: string; type: string; aId: string; bId: string
  aChoice: string; bChoice: string; aDelta: number; bDelta: number; note: string
}
interface GameInfo {
  roundOpen: boolean; currentRound: number; week: number
  students: StudentInfo[]
  lastRound: { round: number; pairings: Pairing[]; snapshotAfter: Record<string,number> } | null
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

function fmt(n: number) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

export default function PlayerPage() {
  const [game, setGame] = useState<GameInfo | null>(null)
  const [myId, setMyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showProtectorates, setShowProtectorates] = useState(false)

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
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ studentId: myId, choice }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Error')
    else await fetchGame()
    setSubmitting(false)
  }

  function selectStudent(id: string) {
    setMyId(id); setCookie(COOKIE, id); setSearch('')
  }

  const me = game?.students.find(s => s.id === myId)
  const myPartner = me?.staplePartnerId ? game?.students.find(s => s.id === me.staplePartnerId) : null
  const myPairing = game?.lastRound?.pairings.find(p => p.aId === myId || p.bId === myId)
  const protectorates = game?.students.filter(s => s.staplePartnerId && s.isHawkInStaple) ?? []
  const filtered = game?.students.filter(s =>
    !s.isEliminated && s.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  // ── Name picker ──────────────────────────────────────────────────────────
  if (!myId || !me) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div className="label" style={{ marginBottom:8 }}>Jesse Driscoll's</div>
          <div style={{ fontSize:34, fontWeight:500, letterSpacing:'-0.02em' }}>
            <span style={{ color:'var(--hawk)' }}>HAWK</span>
            <span style={{ color:'var(--text-dim)', margin:'0 8px' }}>/</span>
            <span style={{ color:'var(--dove)' }}>DOVE</span>
          </div>
        </div>
        <div className="card" style={{ padding:18 }}>
          <div className="label" style={{ marginBottom:10 }}>Who are you?</div>
          <input className="input" placeholder="Search your name..." value={search}
            onChange={e => setSearch(e.target.value)} autoFocus />
          <div style={{ marginTop:6, maxHeight:340, overflowY:'auto' }}>
            {!game && <div style={{ color:'var(--text-dim)', fontSize:12, padding:'8px 0' }}>Loading roster...</div>}
            {game && filtered.length === 0 && search && <div style={{ color:'var(--text-dim)', fontSize:12, padding:'8px 0' }}>No match for "{search}"</div>}
            {game && filtered.length === 0 && !search && game.students.length === 0 && (
              <div style={{ color:'var(--text-dim)', fontSize:12, padding:'8px 0' }}>No roster loaded yet — check back soon.</div>
            )}
            {filtered.map(s => (
              <button key={s.id} onClick={() => selectStudent(s.id)}
                style={{ width:'100%', textAlign:'left', padding:'10px 12px', background:'transparent', border:'none',
                  borderBottom:'1px solid var(--border)', color:'var(--text)', cursor:'pointer', fontFamily:'inherit',
                  display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background 0.1s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-raised)')}
                onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                <div>
                  <div style={{ fontSize:13 }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{s.email}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:'var(--gold)', fontSize:13, fontWeight:500 }}>{s.points} pts</div>
                  {s.staplePartnerId && <div style={{ fontSize:10, color:'var(--hawk)', marginTop:1 }}>📌 Protectorate</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Main student view ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', padding:'20px 16px', maxWidth:500, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:15, fontWeight:500 }}>
          <span style={{ color:'var(--hawk)' }}>HAWK</span>
          <span style={{ color:'var(--text-dim)', margin:'0 5px' }}>/</span>
          <span style={{ color:'var(--dove)' }}>DOVE</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <a href="/display" target="_blank" style={{ fontSize:10, color:'var(--text-dim)', textDecoration:'none', padding:'4px 9px', border:'1px solid var(--border)' }}>📊 Display</a>
          <button className="btn btn-ghost" style={{ fontSize:10, padding:'4px 9px' }}
            onClick={() => { setMyId(''); setCookie(COOKIE,'') }}>Switch player</button>
        </div>
      </div>

      {/* My card */}
      <div className="card fade-in" style={{ padding:18, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div className="label" style={{ marginBottom:3 }}>Player</div>
            <div style={{ fontSize:18, fontWeight:500 }}>{me.name}</div>
            <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:2 }}>{me.email}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className="label" style={{ marginBottom:3 }}>Balance</div>
            <div style={{ fontSize:30, fontWeight:500, color:'var(--gold)', lineHeight:1 }}>{fmt(me.points)}</div>
            <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>pts</div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div className="label">Round {game?.currentRound ?? 0}</div>
          {me.staplePartnerId && myPartner && (
            <span className="tag tag-staple">
              📌 Protectorate with {myPartner.name.split(',')[0]} ({me.isHawkInStaple ? 'you are Hawk' : 'you are Dove'})
            </span>
          )}
          {me.hasChosen && me.choice && (
            <span className={`tag tag-${me.choice}`}>
              {me.choice === 'hawk' ? '🦅' : '🕊️'} {me.choice.toUpperCase()} submitted
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      {me.isEliminated ? (
        <div className="card" style={{ padding:18, textAlign:'center' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💀</div>
          <div style={{ color:'var(--hawk)', fontWeight:500 }}>Eliminated</div>
        </div>
      ) : game?.roundOpen && !me.hasChosen ? (
        <div className="card fade-in" style={{ padding:18, marginBottom:14 }}>
          <div className="label" style={{ marginBottom:14 }}>Choose your strategy</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {(['hawk','dove'] as const).map(c => (
              <button key={c} className={`btn btn-${c}`} disabled={submitting} onClick={() => choose(c)}
                style={{ padding:'22px 10px', fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:26 }}>{c==='hawk'?'🦅':'🕊️'}</span>
                {c.toUpperCase()}
                <span style={{ fontSize:10, fontWeight:400, opacity:0.7, letterSpacing:0, textTransform:'none' }}>
                  {c==='hawk'?'Aggressive':'Cooperative'}
                </span>
              </button>
            ))}
          </div>
          {error && <div style={{ color:'var(--hawk)', fontSize:12, marginTop:10 }}>{error}</div>}
          <div style={{ marginTop:14, padding:10, background:'var(--bg)', border:'1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom:6 }}>Payoff rules</div>
            <div style={{ fontSize:11, color:'var(--text-mid)', lineHeight:1.7 }}>
              <div><span style={{ color:'var(--dove)' }}>D+D</span> → Both gain +1–20 pts (random dice)</div>
              <div><span style={{ color:'var(--hawk)' }}>H+D</span> → Hawk takes 25% of Dove ×3</div>
              <div><span style={{ color:'var(--hawk)' }}>H+H</span> → Higher pts (then tiebreaker) takes all</div>
            </div>
          </div>
        </div>
      ) : game?.roundOpen && me.hasChosen ? (
        <div className="card" style={{ padding:18, textAlign:'center', marginBottom:14 }}>
          <div style={{ color:'var(--text-dim)', fontSize:13 }}>Choice locked. Waiting for round to close.</div>
        </div>
      ) : !game?.roundOpen && myPairing && game?.lastRound && game.lastRound.round === game.currentRound ? (
        <ResultCard pairing={myPairing} me={me} students={game.students} />
      ) : (
        <div className="card" style={{ padding:18, textAlign:'center', marginBottom:14 }}>
          <div style={{ color:'var(--text-dim)', fontSize:13, lineHeight:1.7 }}>
            {game?.currentRound === 0 ? 'Waiting for instructor to open the first round.' : 'Round closed. Waiting for next round.'}
          </div>
        </div>
      )}

      {/* Protectorates list */}
      {protectorates.length > 0 && (
        <div className="card" style={{ padding:14 }}>
          <button onClick={() => setShowProtectorates(!showProtectorates)}
            style={{ width:'100%', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
              display:'flex', justifyContent:'space-between', alignItems:'center', padding:0 }}>
            <div className="label">📌 Protectorates ({protectorates.length} pairs)</div>
            <span style={{ color:'var(--text-dim)', fontSize:12 }}>{showProtectorates ? '▲' : '▼'}</span>
          </button>
          {showProtectorates && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {protectorates.map(hawk => {
                const dove = game?.students.find(s => s.id === hawk.staplePartnerId)
                if (!dove) return null
                return (
                  <div key={hawk.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'8px 10px', background:'var(--bg)', border:'1px solid var(--border)' }}>
                    <div>
                      <span style={{ color:'var(--hawk)', fontSize:12 }}>🦅 {hawk.name}</span>
                      <span style={{ color:'var(--text-dim)', fontSize:11, margin:'0 8px' }}>↔</span>
                      <span style={{ color:'var(--dove)', fontSize:12 }}>🕊️ {dove.name}</span>
                    </div>
                    <div style={{ textAlign:'right', fontSize:11, color:'var(--text-dim)' }}>
                      <div>{hawk.email}</div>
                      <div>{dove.email}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({ pairing, me, students }: { pairing: Pairing; me: StudentInfo; students: StudentInfo[] }) {
  if (pairing.aId === pairing.bId) return (
    <div className="card fade-in" style={{ padding:18, marginBottom:14 }}>
      <div className="label" style={{ marginBottom:8 }}>Last Round</div>
      <div style={{ color:'var(--text-dim)', fontSize:13 }}>You sat out this round.</div>
    </div>
  )
  const isA = pairing.aId === me.id
  const myDelta = isA ? pairing.aDelta : pairing.bDelta
  const myChoice = isA ? pairing.aChoice : pairing.bChoice
  const oppId = isA ? pairing.bId : pairing.aId
  const oppChoice = isA ? pairing.bChoice : pairing.aChoice
  const opp = students.find(s => s.id === oppId)
  const dc = myDelta > 0 ? 'var(--green)' : myDelta < 0 ? 'var(--hawk)' : 'var(--text-dim)'

  return (
    <div className="card fade-in" style={{ padding:18, marginBottom:14 }}>
      <div className="label" style={{ marginBottom:12 }}>Round result</div>
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        {[
          { label:'YOU', name: me.name, choice: myChoice, isMe: true },
          { label: opp?.name.split(',')[0]??'?', name: opp?.name??'?', choice: oppChoice, isMe: false },
        ].map(side => (
          <div key={side.label} style={{ flex:1, padding:10, background:'var(--bg)',
            border:`1px solid ${side.isMe ? 'var(--gold)' : 'var(--border)'}`, textAlign:'center' }}>
            <div style={{ fontSize:11, color: side.isMe ? 'var(--gold)' : 'var(--text-dim)', marginBottom:5 }}>
              {side.isMe ? 'YOU' : side.label}
            </div>
            <span className={`tag tag-${side.choice}`} style={{ fontSize:12 }}>
              {side.choice==='hawk'?'🦅':'🕊️'} {side.choice.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:13, color:'var(--text-mid)' }}>Change</span>
          <span style={{ fontSize:20, fontWeight:500, color:dc }}>{myDelta>0?'+':''}{fmt(myDelta)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
          <span style={{ fontSize:13, color:'var(--text-mid)' }}>New balance</span>
          <span style={{ fontSize:20, fontWeight:500, color:'var(--gold)' }}>{fmt(me.points)}</span>
        </div>
        <div style={{ fontSize:11, color:'var(--text-dim)', lineHeight:1.5 }}>{pairing.note}</div>
      </div>
    </div>
  )
}
