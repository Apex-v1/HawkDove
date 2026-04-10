'use client'
import { useState, useEffect, useCallback } from 'react'

interface StudentInfo {
  id: string; name: string; email: string; points: number
  hasChosen: boolean; choice?: string; isEliminated: boolean
  staplePartnerId?: string; isHawkInStaple?: boolean; tiebreaker?: number
}
interface Pairing {
  pairingId: string; type: string; aId: string; bId: string
  aChoice: string; bChoice: string; aDelta: number; bDelta: number; note: string
}
interface RoundRecord {
  round: number; pairings: Pairing[]
  snapshotBefore: Record<string,number>; snapshotAfter: Record<string,number>
}
interface GameInfo {
  roundOpen: boolean; currentRound: number; week: number; displayRound?: number
  students: StudentInfo[]
  lastRound: RoundRecord | null
  rounds?: RoundRecord[]
}

function fmt(n: number) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

export default function DisplayPage() {
  const [game, setGame] = useState<GameInfo | null>(null)
  const [tab, setTab] = useState<'leaderboard'|'charts'|'pairings'>('leaderboard')
  const [tick, setTick] = useState(0)

  const fetchGame = useCallback(async () => {
    const res = await fetch('/api/game', { cache: 'no-store' })
    const data = await res.json()
    setGame(data)
  }, [])

  useEffect(() => {
    fetchGame()
    const iv = setInterval(fetchGame, 3000)
    const tv = setInterval(() => setTick(t => t + 1), 1000)
    return () => { clearInterval(iv); clearInterval(tv) }
  }, [fetchGame])

  if (!game) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ color:'var(--text-dim)', fontFamily:'inherit' }}>Connecting...</div>
    </div>
  )

  const active = game.students.filter(s => !s.isEliminated)
  const sorted = [...active].sort((a,b) => b.points - a.points)
  const maxPts = sorted[0]?.points || 1
  const hawks = active.filter(s => s.choice === 'hawk')
  const doves = active.filter(s => s.choice === 'dove')
  const submitted = active.filter(s => s.hasChosen).length
  const total = active.reduce((s,x) => s+x.points, 0)
  const hh = String(Math.floor(tick/3600)).padStart(2,'0')
  const mm = String(Math.floor((tick%3600)/60)).padStart(2,'0')
  const ss = String(tick%60).padStart(2,'0')
  const shownRound = game.displayRound ?? game.currentRound

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', fontFamily:'DM Mono, Courier New, monospace' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 24px',
        borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:500 }}>
          <span style={{ color:'var(--hawk)' }}>HAWK</span>
          <span style={{ color:'var(--text-dim)', margin:'0 6px' }}>/</span>
          <span style={{ color:'var(--dove)' }}>DOVE</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {([['WEEK', game.week], ['ROUND', shownRound||'—'], ['ACTIVE', active.length], ['PTS', fmt(total)]] as [string, string|number][]).map(([l,v]) => (
            <div key={String(l)} style={{ textAlign:'center' }}>
              <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'0.2em' }}>{l}</div>
              <div style={{ fontSize:16, fontWeight:500, color:'var(--gold)' }}>{v}</div>
            </div>
          ))}
          {game.roundOpen
            ? <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 10px', border:'1px solid var(--dove)', fontSize:11, color:'var(--dove)' }}>
                <span style={{ animation:'pulse 1s infinite' }}>●</span> OPEN
                <span style={{ marginLeft:8, color:'var(--text-dim)' }}>{submitted}/{active.length}</span>
              </div>
            : <div style={{ padding:'4px 10px', border:'1px solid var(--border)', fontSize:11, color:'var(--text-dim)' }}>CLOSED</div>
          }
          <div style={{ fontSize:13, color:'var(--text-dim)', fontVariantNumeric:'tabular-nums' }}>{hh}:{mm}:{ss}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        {(['leaderboard','charts','pairings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'9px 20px', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase',
              background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
              color: tab===t ? 'var(--text)' : 'var(--text-dim)',
              borderBottom: tab===t ? '2px solid var(--dove)' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <a href="/player" target="_blank"
          style={{ padding:'9px 16px', fontSize:11, letterSpacing:'0.1em', color:'var(--dove)',
            textDecoration:'none', display:'flex', alignItems:'center', borderLeft:'1px solid var(--border)' }}>
          ↗ STUDENT
        </a>
        <a href="/admin" target="_blank"
          style={{ padding:'9px 16px', fontSize:11, letterSpacing:'0.1em', color:'var(--gold)',
            textDecoration:'none', display:'flex', alignItems:'center', borderLeft:'1px solid var(--border)' }}>
          ↗ ADMIN
        </a>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>

        {/* ── LEADERBOARD ── */}
        {tab === 'leaderboard' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, height:'100%' }}>
            <div>
              <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:12 }}>STANDINGS</div>
              {game.roundOpen && (
                <div style={{ marginBottom:10, padding:'8px 12px', background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11, color:'var(--text-dim)' }}>
                    <span>Submissions</span><span style={{ color:'var(--dove)' }}>{submitted} / {active.length}</span>
                  </div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
                    <div style={{ height:'100%', background:'var(--dove)', transition:'width 0.5s',
                      width:`${active.length > 0 ? (submitted/active.length)*100 : 0}%`, borderRadius:2 }} />
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {sorted.map((s,i) => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px',
                    border:'1px solid var(--border)', background:'var(--bg-card)', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, transition:'width 0.7s',
                      width:`${(s.points/maxPts)*100}%`, opacity:0.08,
                      background: s.choice==='hawk'?'var(--hawk)':s.choice==='dove'?'var(--dove)':'var(--text-dim)' }} />
                    <span style={{ fontSize:12, color:i===0?'var(--gold)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--text-dim)', width:20, textAlign:'right', flexShrink:0, position:'relative' }}>
                      {i===0?'★':i+1}
                    </span>
                    <span style={{ flex:1, fontSize:13, color:'var(--text)', position:'relative', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {s.name}
                      {s.staplePartnerId && <span style={{ fontSize:10, color:'var(--gold)', marginLeft:6 }}>📌</span>}
                    </span>
                    {s.hasChosen && s.choice && (
                      <span style={{ fontSize:10, position:'relative', flexShrink:0,
                        color: s.choice==='hawk'?'var(--hawk)':'var(--dove)' }}>
                        {s.choice==='hawk'?'🦅':'🕊️'}
                      </span>
                    )}
                    <span style={{ fontSize:14, fontWeight:500, color:'var(--gold)', position:'relative', flexShrink:0, minWidth:60, textAlign:'right' }}>
                      {fmt(s.points)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Protectorates */}
              {game.students.filter(s => s.staplePartnerId && s.isHawkInStaple).length > 0 && (
                <div style={{ padding:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:10 }}>PROTECTORATES</div>
                  {game.students.filter(s => s.staplePartnerId && s.isHawkInStaple).map(hawk => {
                    const dove = game.students.find(s => s.id === hawk.staplePartnerId)
                    if (!dove) return null
                    return (
                      <div key={hawk.id} style={{ marginBottom:8, padding:'7px 10px', background:'var(--bg)', border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                          <span style={{ color:'var(--hawk)' }}>🦅 {hawk.name.split(',')[0]}</span>
                          <span style={{ color:'var(--gold)', fontSize:11 }}>{fmt(hawk.points)}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginTop:3 }}>
                          <span style={{ color:'var(--dove)' }}>🕊️ {dove.name.split(',')[0]}</span>
                          <span style={{ color:'var(--gold)', fontSize:11 }}>{fmt(dove.points)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Last round results */}
              {game.lastRound && (
                <div style={{ padding:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:10 }}>ROUND {game.lastRound.round} RESULTS</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto' }}>
                    {game.lastRound.pairings.filter(p => p.aId !== p.bId).slice(0,10).map(p => {
                      const a = game.students.find(s => s.id === p.aId)
                      const b = game.students.find(s => s.id === p.bId)
                      const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--dove)':p.type==='STAPLED'?'var(--gold)':'var(--text-mid)'
                      return (
                        <div key={p.pairingId} style={{ fontSize:10, display:'flex', gap:4, alignItems:'center', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ color:tc, width:36, flexShrink:0 }}>{p.type}</span>
                          <span style={{ flex:1, color:'var(--text-mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {a?.name.split(',')[0]??'?'} vs {b?.name.split(',')[0]??'?'}
                          </span>
                          <span style={{ color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)', flexShrink:0 }}>
                            {p.aDelta>0?'+':''}{fmt(p.aDelta)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CHARTS ── */}
        {tab === 'charts' && <ChartsPanel game={game} />}

        {/* ── PAIRINGS ── */}
        {tab === 'pairings' && game.lastRound && (
          <div>
            <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:12 }}>
              ROUND {game.lastRound.round} — ALL PAIRINGS
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:10 }}>
              {game.lastRound.pairings.filter(p=>p.aId!==p.bId).map(p => {
                const a = game.students.find(s => s.id === p.aId)
                const b = game.students.find(s => s.id === p.bId)
                const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--dove)':p.type==='STAPLED'?'var(--gold)':'var(--text-mid)'
                return (
                  <div key={p.pairingId} style={{ padding:12, background:'var(--bg-card)', border:`1px solid ${tc}33` }}>
                    <div style={{ fontSize:10, color:tc, letterSpacing:'0.15em', marginBottom:8 }}>{p.type}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'var(--text)' }}>{a?.name.split(',')[0]??'?'}</span>
                      <span style={{ fontSize:12, color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)' }}>
                        {p.aDelta>0?'+':''}{fmt(p.aDelta)}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:12, color:'var(--text)' }}>{b?.name.split(',')[0]??'?'}</span>
                      <span style={{ fontSize:12, color:p.bDelta>0?'var(--green)':p.bDelta<0?'var(--hawk)':'var(--text-dim)' }}>
                        {p.bDelta>0?'+':''}{fmt(p.bDelta)}
                      </span>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-dim)', lineHeight:1.4 }}>{p.note}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChartsPanel({ game }: { game: GameInfo }) {
  const active = game.students.filter(s => !s.isEliminated)
  const sorted = [...active].sort((a,b) => b.points - a.points)
  const hawks = active.filter(s => s.choice === 'hawk')
  const doves = active.filter(s => s.choice === 'dove')
  const students = game.students
  const eliminated = students.filter(s => s.isEliminated)
  const lastRound = game.lastRound
  const maxPts = sorted[0]?.points || 1

  const hawkPts = hawks.map(s => s.points)
  const dovePts = doves.map(s => s.points)
  const hawkAvg = hawkPts.length ? Math.round(hawkPts.reduce((a,b)=>a+b,0)/hawkPts.length) : 0
  const doveAvg = dovePts.length ? Math.round(dovePts.reduce((a,b)=>a+b,0)/dovePts.length) : 0
  const total = active.reduce((s,x) => s+x.points, 0)
  const doveUnder400 = dovePts.length ? Math.round(dovePts.filter(p=>p<400).length/dovePts.length*100) : 0
  const hawkOver500 = hawkPts.length ? Math.round(hawkPts.filter(p=>p>500).length/hawkPts.length*100) : 0
  const top20pct = sorted.slice(0, Math.ceil(active.length * 0.2))
  const top20pts = top20pct.reduce((s,x)=>s+x.points,0)
  const top20share = total > 0 ? Math.round(top20pts/total*100) : 0

  const quotes = [
    `${doveUnder400}% of doves hold fewer than 400 pts.`,
    `Hawks avg ${fmt(hawkAvg)} pts vs doves at ${fmt(doveAvg)} pts.`,
    `${hawkOver500}% of hawks hold over 500 pts.`,
    `Top 20% of players control ${top20share}% of all pts.`,
  ]

  // Bucket distribution
  const buckets = [
    { label:'0', count: active.filter(s=>s.points===0).length },
    { label:'1–99', count: active.filter(s=>s.points>0&&s.points<100).length },
    { label:'100–299', count: active.filter(s=>s.points>=100&&s.points<300).length },
    { label:'300–599', count: active.filter(s=>s.points>=300&&s.points<600).length },
    { label:'600+', count: active.filter(s=>s.points>=600).length },
  ]
  const maxBucket = Math.max(...buckets.map(b=>b.count), 1)

  const roundGains = lastRound ? active.map(s => ({
    name: s.name.split(',')[0],
    delta: (lastRound.snapshotAfter[s.name] ?? s.points) - (lastRound.snapshotBefore[s.name] ?? s.points),
  })).sort((a,b) => b.delta - a.delta) : []
  const topGainers = roundGains.slice(0,5)
  const topLosers = [...roundGains].sort((a,b)=>a.delta-b.delta).slice(0,5)
  const maxDelta = Math.max(...roundGains.map(g=>Math.abs(g.delta)), 1)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      {/* Insight quotes */}
      <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {quotes.map((q,i) => (
          <div key={i} style={{ padding:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:9, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:6 }}>INSIGHT {i+1}</div>
            <div style={{ fontSize:13, color:'var(--gold)', lineHeight:1.5 }}>"{q}"</div>
          </div>
        ))}
      </div>

      {/* Points distribution */}
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>POINTS DISTRIBUTION</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {buckets.map(b => (
            <div key={b.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:60, fontSize:11, color:'var(--text-dim)', textAlign:'right', flexShrink:0 }}>{b.label}</div>
              <div style={{ flex:1, height:20, background:'var(--bg-raised)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s',
                  width:`${(b.count/maxBucket)*100}%`,
                  background: b.label==='0' ? 'var(--hawk-bg)' : 'var(--dove-bg)',
                  borderRight:`2px solid ${b.label==='0' ? 'var(--hawk)' : 'var(--dove)'}` }} />
                <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-mid)' }}>{b.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All players bars */}
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ALL PLAYERS — POINTS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto' }}>
          {sorted.map((s,i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:110, fontSize:11, color:i===0?'var(--gold)':'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {s.name.split(',')[0]}
              </div>
              <div style={{ flex:1, height:14, background:'var(--bg-raised)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s',
                  width:`${(s.points/maxPts)*100}%`,
                  background: s.choice==='hawk'?'var(--hawk-bg)':s.choice==='dove'?'var(--dove-bg)':'var(--bg)',
                  borderRight:`2px solid ${s.choice==='hawk'?'var(--hawk)':s.choice==='dove'?'var(--dove)':'var(--border-hi)'}` }} />
              </div>
              <div style={{ width:55, textAlign:'right', fontSize:11, color:'var(--gold)', fontWeight:500 }}>{fmt(s.points)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top gainers */}
      {lastRound && topGainers.length > 0 && (
        <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ROUND {lastRound.round} — TOP GAINERS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topGainers.map(g => (
              <div key={g.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:100, fontSize:11, color:'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                <div style={{ flex:1, height:16, background:'var(--bg-raised)', position:'relative' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s',
                    width:`${(Math.max(g.delta,0)/maxDelta)*100}%`,
                    background:'var(--green-bg)', borderRight:'2px solid var(--green)' }} />
                </div>
                <div style={{ width:60, textAlign:'right', fontSize:12, color:'var(--green)', fontWeight:500 }}>
                  {g.delta>0?'+':''}{fmt(g.delta)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top losers */}
      {lastRound && topLosers.length > 0 && (
        <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ROUND {lastRound.round} — BIGGEST LOSSES</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topLosers.filter(g=>g.delta<0).map(g => (
              <div key={g.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:100, fontSize:11, color:'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                <div style={{ flex:1, height:16, background:'var(--bg-raised)', position:'relative' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s',
                    width:`${(Math.abs(g.delta)/maxDelta)*100}%`,
                    background:'var(--hawk-bg)', borderRight:'2px solid var(--hawk)' }} />
                </div>
                <div style={{ width:60, textAlign:'right', fontSize:12, color:'var(--hawk)', fontWeight:500 }}>
                  {fmt(g.delta)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hawk vs Dove avg */}
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)', gridColumn:'1/-1' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>HAWK vs DOVE — AVERAGE POINTS</div>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', height:80 }}>
          {[
            { label:`🦅 Hawks (${hawks.length})`, avg: hawkAvg, color:'var(--hawk)', bg:'var(--hawk-bg)' },
            { label:`🕊️ Doves (${doves.length})`, avg: doveAvg, color:'var(--dove)', bg:'var(--dove-bg)' },
          ].map(bar => {
            const maxAvg = Math.max(hawkAvg, doveAvg, 1)
            const h = Math.round((bar.avg / maxAvg) * 70)
            return (
              <div key={bar.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:bar.color }}>{fmt(bar.avg)} pts</div>
                <div style={{ width:'100%', height:h, background:bar.bg, border:`1px solid ${bar.color}`, transition:'height 0.6s', minHeight:4 }} />
                <div style={{ fontSize:11, color:'var(--text-mid)' }}>{bar.label}</div>
              </div>
            )
          })}
          <div style={{ flex:3 }} />
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text-dim)' }}>{eliminated.length}</div>
            <div style={{ width:60, height:Math.max(Math.round((eliminated.length/Math.max(students.length,1))*70),4),
              background:'rgba(232,55,42,0.08)', border:'1px solid rgba(232,55,42,0.3)', transition:'height 0.6s' }} />
            <div style={{ fontSize:11, color:'var(--text-dim)' }}>💀 Eliminated</div>
          </div>
        </div>
      </div>
    </div>
  )
}
