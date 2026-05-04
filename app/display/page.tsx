'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

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
  round: number; week: number; pairings: Pairing[]
  snapshotBefore: Record<string,number>; snapshotAfter: Record<string,number>
  finalizedAt?: string
}
interface NewsItem { id: string; html: string; createdAt: string }
interface ArchiveArticle { id: string; headline: string; body: string; pullQuote?: string; createdAt: string }
interface GameInfo {
  roundOpen: boolean; currentRound: number; week: number; displayRound?: number
  gameTitle?: string
  votingTabOpen: boolean; newsboxTabOpen: boolean
  gazetteTabOpen: boolean; archiveTabOpen: boolean
  newsItems: NewsItem[]; archiveArticles: ArchiveArticle[]
  voting: { open: boolean; optionA: string; optionB: string; deadline: string; resultsRevealed: boolean; presidentId?: string; presidentTitle?: string }
  students: StudentInfo[]
  lastRound: RoundRecord | null
  rounds?: RoundRecord[]
}

function fmt(n: number) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

type Tab = 'leaderboard' | 'charts' | 'pairings' | 'vote' | 'newsbox' | 'gazette' | 'archive'

// ── GAZETTE READER COMPONENT ──
function GazetteReader({ game, mode }: { game: GameInfo; mode: 'gazette' | 'archive' }) {
  const [cur, setCur] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState<Record<number,number>>({})
  const [panY, setPanY] = useState<Record<number,number>>({})
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const tilts = [-0.35, 0.28, -0.22, 0.31, -0.18, 0.25, -0.3, 0.2]

  function doZoom(d: number) { setZoom(z => Math.min(2.5, Math.max(0.5, Math.round((z + d) * 100) / 100))) }
  function resetZoom() { setZoom(1); setPanX({}); setPanY({}) }

  function startDrag(e: React.MouseEvent) {
    if (zoom <= 1) return
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
  function onDrag(e: React.MouseEvent) {
    if (!dragging.current) return
    const dx = (e.clientX - dragStart.current.x) / zoom
    const dy = (e.clientY - dragStart.current.y) / zoom
    setPanX(p => ({ ...p, [cur]: (p[cur] || 0) + dx }))
    setPanY(p => ({ ...p, [cur]: (p[cur] || 0) + dy }))
    dragStart.current = { x: e.clientX, y: e.clientY }
  }
  function endDrag() { dragging.current = false }

  // Build pages based on mode
  const pages: { label: string; sublabel: string; content: React.ReactNode }[] = []

  if (mode === 'gazette') {
    const rounds = [...(game.rounds || [])].reverse() // newest first
    // Final edition page
    const sorted = [...game.students].filter(s => !s.isEliminated).sort((a,b) => b.points - a.points)
    const total = game.students.reduce((s,x) => s+x.points, 0)
    const hawks = game.students.filter(s => s.choice === 'hawk')
    const doves = game.students.filter(s => s.choice === 'dove')
    const hawkAvg = hawks.length ? Math.round(hawks.reduce((s,x) => s+x.points, 0)/hawks.length) : 0
    const doveAvg = doves.length ? Math.round(doves.reduce((s,x) => s+x.points, 0)/doves.length) : 0
    const top5pts = sorted.slice(0,5).reduce((s,x) => s+x.points, 0)
    const top5pct = total > 0 ? Math.round(top5pts/total*100) : 0
    const protectorates = game.students.filter(s => s.staplePartnerId && s.isHawkInStaple)

    pages.push({
      label: 'Final Edition',
      sublabel: 'End of Game',
      content: (
        <div style={{ padding:'12px 14px', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:2 }}>
          <div style={{ textAlign:'center', borderBottom:'3px double #1a1208', paddingBottom:'6px', marginBottom:'5px' }}>
            <div style={{ fontSize:'22px', fontWeight:700, letterSpacing:'.04em', fontFamily:'Times New Roman,serif', lineHeight:1 }}>The Hawk Gazette</div>
            <div style={{ fontSize:'7px', letterSpacing:'.18em', color:'#5a4a30', marginTop:'2px', textTransform:'uppercase' }}>Official Record · Jesse Driscoll · UCSD · Social Redistribution Game</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'7px', color:'#5a4a30', marginTop:'4px', paddingTop:'3px', borderTop:'1px solid #1a1208' }}>
              <span>Final Edition · Vol.1</span><span>Spring 2026 · {game.students.length} Players · {game.rounds?.length||0} Rounds</span><span>Price: Your Points</span>
            </div>
          </div>
          <div style={{ textAlign:'center', fontSize:'15px', fontWeight:700, borderBottom:'2px solid #1a1208', paddingBottom:'3px', marginBottom:'3px', fontFamily:'Times New Roman,serif', lineHeight:1.2 }}>
            {sorted[0] ? `${sorted[0].name.split(',')[0].toUpperCase()} LEADS WITH ${fmt(sorted[0].points)} POINTS` : 'SIMULATION COMPLETE'}
          </div>
          <div style={{ textAlign:'center', fontSize:'7.5px', color:'#5a4a30', fontStyle:'italic', marginBottom:'6px' }}>
            The final tally is in. {game.rounds?.length||0} rounds of play have concluded.
          </div>
          <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 2px 1fr 2px 1fr 2px 1fr', gap:0 }}>
            <div style={{ padding:'0 5px', overflow:'hidden' }}>
              <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Final Top {Math.min(10,sorted.length)} Standings</div>
              <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>By rank</div>
              {sorted.slice(0,10).map((s,i) => (
                <div key={s.id} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #c8b89a', padding:'1px 0', fontSize:'7.5px' }}>
                  <span>{i+1}. {s.name.split(',')[0]}</span><strong>{fmt(s.points)}</strong>
                </div>
              ))}
            </div>
            <div style={{ background:'#2a1a0a', margin:'0 3px', opacity:.55 }}></div>
            <div style={{ padding:'0 5px', overflow:'hidden' }}>
              <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Hawk vs Dove Analysis</div>
              <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Economics Desk</div>
              <div style={{ fontSize:'8.5px', lineHeight:1.5, textAlign:'justify' }}>
                The simulation concluded with {hawks.length} hawks and {doves.length} doves having submitted final choices. Hawk average: {fmt(hawkAvg)} points. Dove average: {fmt(doveAvg)} points. The top 5 players controlled {top5pct}% of total wealth at game end.
              </div>
              <div style={{ borderTop:'1.5px solid #1a1208', borderBottom:'1.5px solid #1a1208', padding:'4px 5px', margin:'4px 0', fontSize:'8.5px', fontStyle:'italic', fontWeight:700, textAlign:'center', lineHeight:1.25 }}>
                {hawkAvg > doveAvg ? `Hawks outperformed doves by ${fmt(hawkAvg - doveAvg)} points on average.` : `Doves held their own this simulation.`}
              </div>
              <div style={{ fontSize:'8.5px', lineHeight:1.5, textAlign:'justify' }}>
                Total points in circulation: {fmt(total)}. Protectorates active in Week 2: {protectorates.length} pairs. Players eliminated: {game.students.filter(s=>s.isEliminated).length}.
              </div>
            </div>
            <div style={{ background:'#2a1a0a', margin:'0 3px', opacity:.55 }}></div>
            <div style={{ padding:'0 5px', overflow:'hidden' }}>
              <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Protectorate Summary</div>
              <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Finance Desk</div>
              {protectorates.length > 0 ? protectorates.map(hawk => {
                const dove = game.students.find(s => s.id === hawk.staplePartnerId)
                return (
                  <div key={hawk.id} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                    <strong>{hawk.name.split(',')[0]}</strong> ↔ {dove?.name.split(',')[0]||'?'}
                  </div>
                )
              }) : <div style={{ fontSize:'8px', color:'#5a4a30', fontStyle:'italic' }}>No protectorates formed.</div>}
              <div style={{ borderTop:'1px solid #2a1a0a', marginTop:'5px', paddingTop:'3px', opacity:.35 }}></div>
              <div style={{ fontSize:'7.5px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', borderBottom:'1px solid #2a1a0a', marginBottom:'2px', marginTop:'5px', fontFamily:'Times New Roman,serif' }}>Notices</div>
              <div style={{ fontSize:'7.5px', lineHeight:1.4 }}>
                SIMULATION COMPLETE. All final points recorded. For the full historical record, consult the Admin archive. Results are final and cannot be appealed.
              </div>
            </div>
            <div style={{ background:'#2a1a0a', margin:'0 3px', opacity:.55 }}></div>
            <div style={{ padding:'0 5px', overflow:'hidden' }}>
              <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Round-by-Round Summary</div>
              <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Editorial Board</div>
              {(game.rounds||[]).map(r => {
                const hh = r.pairings.filter(p=>p.type==='H+H').length
                const hd = r.pairings.filter(p=>p.type==='H+D').length
                const dd = r.pairings.filter(p=>p.type==='D+D').length
                const st = r.pairings.filter(p=>p.type==='STAPLED').length
                return (
                  <div key={r.round} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                    <strong>Round {r.round} · Wk {r.week}:</strong> {hh} H+H · {hd} H+D · {dd} D+D{st > 0 ? ` · ${st} Stapled` : ''}
                  </div>
                )
              })}
              {(!game.rounds || game.rounds.length === 0) && <div style={{ fontSize:'8px', color:'#5a4a30', fontStyle:'italic' }}>No rounds finalized yet.</div>}
            </div>
          </div>
        </div>
      )
    })

    // One page per round (newest first)
    rounds.forEach((r, ri) => {
      const hhPairs = r.pairings.filter(p => p.type === 'H+H' && p.aId !== p.bId)
      const hdPairs = r.pairings.filter(p => p.type === 'H+D')
      const ddPairs = r.pairings.filter(p => p.type === 'D+D' && p.aId !== p.bId)
      const stapledPairs = r.pairings.filter(p => p.type === 'STAPLED')
      const biggestGain = [...r.pairings].sort((a,b) => Math.max(b.aDelta,b.bDelta) - Math.max(a.aDelta,a.bDelta))[0]
      const biggestLoss = [...r.pairings].sort((a,b) => Math.min(a.aDelta,a.bDelta) - Math.min(b.aDelta,b.bDelta))[0]

      pages.push({
        label: `Round ${r.round}`,
        sublabel: `Week ${r.week}`,
        content: (
          <div style={{ padding:'12px 14px', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:2 }}>
            <div style={{ fontSize:'7px', color:'#5a4a30', letterSpacing:'.15em', textTransform:'uppercase', borderBottom:'1px solid #1a1208', paddingBottom:'2px', marginBottom:'5px' }}>
              The Hawk Gazette · Round {r.round} · Week {r.week} · {r.finalizedAt ? new Date(r.finalizedAt).toLocaleDateString() : ''}
            </div>
            <div style={{ textAlign:'center', fontSize:'14px', fontWeight:700, borderBottom:'2px solid #1a1208', paddingBottom:'3px', marginBottom:'3px', fontFamily:'Times New Roman,serif', lineHeight:1.2 }}>
              ROUND {r.round} RESULTS: {hhPairs.length} H+H · {hdPairs.length} H+D · {ddPairs.length} D+D{stapledPairs.length > 0 ? ` · ${stapledPairs.length} STAPLED` : ''}
            </div>
            <div style={{ textAlign:'center', fontSize:'7.5px', color:'#5a4a30', fontStyle:'italic', marginBottom:'6px' }}>
              All pairings resolved. Point transfers recorded below.
            </div>
            <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 2px 1fr 2px 1fr', gap:0 }}>
              <div style={{ padding:'0 5px', overflow:'hidden' }}>
                <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>H+H Battles</div>
                <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Sports Desk</div>
                {hhPairs.length === 0 && <div style={{ fontSize:'8px', color:'#5a4a30', fontStyle:'italic' }}>No H+H pairings this round.</div>}
                {hhPairs.map(p => {
                  const a = game.students.find(s => s.id === p.aId)
                  const b = game.students.find(s => s.id === p.bId)
                  return (
                    <div key={p.pairingId} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                      <strong>{p.aDelta > 0 ? a?.name.split(',')[0] : b?.name.split(',')[0]}</strong> defeats {p.aDelta > 0 ? b?.name.split(',')[0] : a?.name.split(',')[0]} — {p.note}
                    </div>
                  )
                })}
                <div style={{ borderTop:'1px solid #2a1a0a', marginTop:'5px', paddingTop:'3px', opacity:.35 }}></div>
                <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', marginTop:'5px', fontFamily:'Times New Roman,serif' }}>D+D Rolls</div>
                {ddPairs.length === 0 && <div style={{ fontSize:'8px', color:'#5a4a30', fontStyle:'italic' }}>No D+D pairings this round.</div>}
                {ddPairs.map(p => {
                  const a = game.students.find(s => s.id === p.aId)
                  const b = game.students.find(s => s.id === p.bId)
                  return (
                    <div key={p.pairingId} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                      {a?.name.split(',')[0]} +{fmt(p.aDelta)} · {b?.name.split(',')[0]} +{fmt(p.bDelta)}
                    </div>
                  )
                })}
              </div>
              <div style={{ background:'#2a1a0a', margin:'0 3px', opacity:.55 }}></div>
              <div style={{ padding:'0 5px', overflow:'hidden' }}>
                <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>H+D Transfers</div>
                <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Markets Correspondent</div>
                {hdPairs.length === 0 && <div style={{ fontSize:'8px', color:'#5a4a30', fontStyle:'italic' }}>No H+D pairings this round.</div>}
                {hdPairs.map(p => {
                  const a = game.students.find(s => s.id === p.aId)
                  const b = game.students.find(s => s.id === p.bId)
                  const hawk = p.aChoice === 'hawk' ? a : b
                  const dove = p.aChoice === 'hawk' ? b : a
                  const gain = p.aChoice === 'hawk' ? p.aDelta : p.bDelta
                  const loss = p.aChoice === 'hawk' ? p.bDelta : p.aDelta
                  return (
                    <div key={p.pairingId} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                      <strong>{hawk?.name.split(',')[0]}</strong> +{fmt(gain)} / {dove?.name.split(',')[0]} {fmt(loss)}
                    </div>
                  )
                })}
                {biggestGain && (
                  <>
                    <div style={{ borderTop:'1.5px solid #1a1208', borderBottom:'1.5px solid #1a1208', padding:'4px 5px', margin:'6px 0', fontSize:'8.5px', fontStyle:'italic', fontWeight:700, textAlign:'center', lineHeight:1.25 }}>
                      Biggest gain: +{fmt(Math.max(biggestGain.aDelta, biggestGain.bDelta))} pts
                    </div>
                  </>
                )}
              </div>
              <div style={{ background:'#2a1a0a', margin:'0 3px', opacity:.55 }}></div>
              <div style={{ padding:'0 5px', overflow:'hidden' }}>
                {stapledPairs.length > 0 && (
                  <>
                    <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Protectorate Transfers</div>
                    <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'3px' }}>Finance Desk</div>
                    {stapledPairs.map(p => {
                      const a = game.students.find(s => s.id === p.aId)
                      const b = game.students.find(s => s.id === p.bId)
                      return (
                        <div key={p.pairingId} style={{ borderBottom:'1px solid #c8b89a', padding:'2px 0', fontSize:'7.5px' }}>
                          {a?.name.split(',')[0]} ↔ {b?.name.split(',')[0]}: {p.note}
                        </div>
                      )
                    })}
                    <div style={{ borderTop:'1px solid #2a1a0a', margin:'5px 0', opacity:.35 }}></div>
                  </>
                )}
                <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'2px', fontFamily:'Times New Roman,serif' }}>Round {r.round} Standings</div>
                {Object.entries(r.snapshotAfter).sort(([,a],[,b]) => b-a).slice(0,12).map(([name, pts]) => (
                  <div key={name} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #c8b89a', padding:'1px 0', fontSize:'7px' }}>
                    <span>{name.split(',')[0]}</span><strong>{fmt(pts)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })
    })

  } else {
    // ARCHIVE mode
    const articles = game.archiveArticles || []
    if (articles.length === 0) {
      pages.push({
        label: 'No articles',
        sublabel: 'Archive empty',
        content: (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
            <div style={{ textAlign:'center', color:'#5a4a30', fontFamily:'Georgia,serif', padding:'20px' }}>
              <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'8px', fontFamily:'Times New Roman,serif' }}>The Archive</div>
              <div style={{ fontSize:'8.5px', lineHeight:1.7 }}>No articles posted yet.<br/>Add articles from the Admin → Newsbox tab.</div>
            </div>
          </div>
        )
      })
    } else {
      articles.forEach((article, ai) => {
        pages.push({
          label: `Article ${ai + 1}`,
          sublabel: timeAgo(article.createdAt),
          content: (
            <div style={{ padding:'12px 14px', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', zIndex:2 }}>
              <div style={{ textAlign:'center', borderBottom:'3px double #1a1208', paddingBottom:'6px', marginBottom:'5px' }}>
                <div style={{ fontSize:'20px', fontWeight:700, letterSpacing:'.04em', fontFamily:'Times New Roman,serif', lineHeight:1 }}>The Archive</div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'7px', color:'#5a4a30', marginTop:'4px', paddingTop:'3px', borderTop:'1px solid #1a1208' }}>
                  <span>Vol.1 · Article {ai+1}</span><span>Jesse Driscoll · UCSD</span><span>{timeAgo(article.createdAt)}</span>
                </div>
              </div>
              <div style={{ fontSize:'17px', fontWeight:700, borderBottom:'2px solid #1a1208', paddingBottom:'3px', marginBottom:'3px', fontFamily:'Times New Roman,serif', lineHeight:1.2 }}>
                {article.headline}
              </div>
              <div style={{ fontSize:'7px', color:'#5a4a30', marginBottom:'8px' }}>By the Editorial Board · For Posterity</div>
              <div style={{ flex:1, overflow:'hidden', display:'grid', gridTemplateColumns: article.pullQuote ? '2fr 2px 1fr' : '1fr', gap:0 }}>
                <div style={{ padding:'0 5px 0 0', overflow:'hidden' }}>
                  <div style={{ fontSize:'9px', lineHeight:1.6, textAlign:'justify', whiteSpace:'pre-wrap' }}>
                    {article.body}
                  </div>
                </div>
                {article.pullQuote && (
                  <>
                    <div style={{ background:'#2a1a0a', margin:'0 8px', opacity:.55 }}></div>
                    <div style={{ padding:'0 0 0 5px', overflow:'hidden' }}>
                      <div style={{ borderTop:'1.5px solid #1a1208', borderBottom:'1.5px solid #1a1208', padding:'8px 6px', margin:'0 0 10px', fontSize:'11px', fontStyle:'italic', fontWeight:700, textAlign:'center', lineHeight:1.4 }}>
                        "{article.pullQuote}"
                      </div>
                      <div style={{ fontSize:'9px', fontWeight:700, borderBottom:'1px solid #2a1a0a', paddingBottom:'2px', marginBottom:'5px', fontFamily:'Times New Roman,serif' }}>Filed for Record</div>
                      <div style={{ fontSize:'8px', color:'#5a4a30', lineHeight:1.6 }}>
                        This account has been entered into the permanent record of the simulation. All statements are those of the author and represent their own understanding of events.
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })
      })
    }
  }

  const total = pages.length

  return (
    <div style={{ background:'#07080b', backgroundImage:'linear-gradient(rgba(26,32,48,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(26,32,48,0.5) 1px,transparent 1px)', backgroundSize:'48px 48px', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'DM Mono,Courier New,monospace' }}>
      {/* Reader */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative', minHeight:0 }}>
        {/* Scan lines */}
        <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(232,160,32,0.01) 3px,rgba(232,160,32,0.01) 4px)', pointerEvents:'none', zIndex:10 }}></div>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.55) 100%)', pointerEvents:'none', zIndex:11 }}></div>

        {/* Roll panel */}
        <div style={{ width:'175px', flexShrink:0, background:'#0c0f14', borderRight:'1px solid #1a2030', display:'flex', flexDirection:'column', zIndex:5 }}>
          <div style={{ padding:'9px 12px', borderBottom:'1px solid #1a2030', fontSize:'9px', letterSpacing:'.2em', color:'#5a6a80', textTransform:'uppercase' }}>
            {mode === 'gazette' ? `Film Roll — ${total} Editions` : `Archive — ${total} Articles`}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {pages.map((p, i) => (
              <div key={i} onClick={() => setCur(i)}
                style={{ padding:'9px 12px', borderBottom:'1px solid #1a2030', borderLeft:`2px solid ${cur===i ? '#e8a020' : 'transparent'}`, cursor:'pointer', background: cur===i ? '#111620' : 'transparent' }}>
                <div style={{ fontSize:'9px', color:'#5a6a80', marginBottom:'2px' }}>{p.sublabel}</div>
                <div style={{ fontSize:'10px', color: cur===i ? '#d8e0ea' : '#8a9ab0', lineHeight:1.3 }}>{p.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:'8px 10px', borderTop:'1px solid #1a2030' }}>
            <div style={{ fontSize:'9px', color:'#5a6a80', letterSpacing:'.1em', marginBottom:'4px', textTransform:'uppercase' }}>Advance</div>
            <div style={{ display:'flex', gap:'3px', marginBottom:'8px' }}>
              <button onClick={() => setCur(c => Math.max(0,c-1))} disabled={cur===0}
                style={{ flex:1, fontSize:'9px', padding:'3px', background:'transparent', border:'1px solid #253040', color:'#5a6a80', cursor:'pointer', fontFamily:'inherit', opacity: cur===0 ? .2 : 1 }}>◀</button>
              <button onClick={() => setCur(c => Math.min(total-1,c+1))} disabled={cur===total-1}
                style={{ flex:1, fontSize:'9px', padding:'3px', background:'transparent', border:'1px solid #253040', color:'#5a6a80', cursor:'pointer', fontFamily:'inherit', opacity: cur===total-1 ? .2 : 1 }}>▶</button>
            </div>
            <div style={{ fontSize:'9px', color:'#5a6a80', letterSpacing:'.1em', marginBottom:'4px', textTransform:'uppercase', borderTop:'1px solid #1a2030', paddingTop:'8px' }}>Zoom</div>
            <div style={{ display:'flex', gap:'3px', alignItems:'center', marginBottom:'4px' }}>
              <button onClick={() => doZoom(-0.15)} style={{ flex:1, fontSize:'12px', padding:'2px', background:'transparent', border:'1px solid #253040', color:'#5a6a80', cursor:'pointer', fontFamily:'inherit' }}>−</button>
              <div style={{ fontSize:'9px', color:'#5a6a80', minWidth:'36px', textAlign:'center' }}>{Math.round(zoom*100)}%</div>
              <button onClick={() => doZoom(0.15)} style={{ flex:1, fontSize:'12px', padding:'2px', background:'transparent', border:'1px solid #253040', color:'#5a6a80', cursor:'pointer', fontFamily:'inherit' }}>+</button>
            </div>
            <button onClick={resetZoom} style={{ width:'100%', fontSize:'9px', padding:'3px', background:'transparent', border:'1px solid #253040', color:'#5a6a80', cursor:'pointer', fontFamily:'inherit', letterSpacing:'.08em' }}>Reset</button>
            <div style={{ fontSize:'8px', color:'#5a6a80', marginTop:'6px', lineHeight:1.5, letterSpacing:'.04em' }}>Drag paper to pan when zoomed</div>
          </div>
        </div>

        {/* Viewer */}
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ display:'flex', transition:'transform .38s cubic-bezier(.77,0,.175,1)', height:'100%', transform:`translateX(-${cur*100}%)` }}>
            {pages.map((p, i) => (
              <div key={i} style={{ flexShrink:0, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:'14px' }}>
                <div style={{ width:'100%', maxWidth:'570px', height:'100%', maxHeight:'520px', overflow:'hidden', position:'relative', cursor: zoom > 1 ? 'grab' : 'default' }}
                  onMouseDown={startDrag} onMouseMove={onDrag} onMouseUp={endDrag} onMouseLeave={endDrag}>
                  <div style={{ position:'absolute', top:0, left:0, transformOrigin:'top left', transform:`scale(${zoom}) translate(${panX[i]||0}px,${panY[i]||0}px)`, willChange:'transform' }}>
                    <div style={{ background:'#ede2c0', fontFamily:'Georgia,Times New Roman,serif', color:'#1a1208', width:'570px', height:'520px', overflow:'hidden', boxShadow:'0 0 30px rgba(232,160,32,0.07),0 8px 32px rgba(0,0,0,0.5)', borderRadius:'2px', position:'relative', transform:`rotate(${tilts[i % tilts.length]}deg)` }}>
                      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 15% 20%,rgba(255,255,200,0.12),transparent 50%),radial-gradient(ellipse at 85% 80%,rgba(160,120,60,0.09),transparent 45%)', pointerEvents:'none', zIndex:1 }}></div>
                      <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 16px,rgba(0,0,0,0.018) 16px,rgba(0,0,0,0.018) 17px)', pointerEvents:'none', zIndex:1 }}></div>
                      {p.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ background:'#0c0f14', borderTop:'1px solid #1a2030', padding:'7px 14px', display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
        <button onClick={() => setCur(c => Math.max(0,c-1))} disabled={cur===0}
          style={{ background:'transparent', border:'1px solid #253040', color:'#5a6a80', fontFamily:'inherit', fontSize:'10px', padding:'4px 12px', cursor:'pointer', letterSpacing:'.1em', textTransform:'uppercase', opacity: cur===0 ? .2 : 1 }}>◀ Prev</button>
        <div style={{ display:'flex', gap:'4px', flex:1, overflowX:'auto' }}>
          {pages.map((p, i) => (
            <div key={i} onClick={() => setCur(i)}
              style={{ width:'44px', height:'22px', background:'#111620', border:`1px solid ${cur===i ? '#e8a020' : '#253040'}`, cursor:'pointer', flexShrink:0, opacity: cur===i ? 1 : .5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', color: cur===i ? '#e8a020' : '#5a6a80', letterSpacing:'.04em', transition:'all .15s' }}>
              {p.label.slice(0,6)}
            </div>
          ))}
        </div>
        <div style={{ fontSize:'9px', color:'#5a6a80', letterSpacing:'.1em', minWidth:'40px', textAlign:'center' }}>{cur+1} / {total}</div>
        <button onClick={() => setCur(c => Math.min(total-1,c+1))} disabled={cur===total-1}
          style={{ background:'transparent', border:'1px solid #253040', color:'#5a6a80', fontFamily:'inherit', fontSize:'10px', padding:'4px 12px', cursor:'pointer', letterSpacing:'.1em', textTransform:'uppercase', opacity: cur===total-1 ? .2 : 1 }}>Next ▶</button>
      </div>
    </div>
  )
}

export default function DisplayPage() {
  const [game, setGame] = useState<GameInfo | null>(null)
  const [tab, setTab] = useState<Tab>('leaderboard')
  const [tick, setTick] = useState(0)
  const [voteEmail, setVoteEmail] = useState('')
  const [voteChoice, setVoteChoice] = useState('')
  const [voteSubmitting, setVoteSubmitting] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [voteDone, setVoteDone] = useState(false)

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
  const submitted = active.filter(s => s.hasChosen || !!s.staplePartnerId).length
  const total = active.reduce((s,x) => s+x.points, 0)
  const hh = String(Math.floor(tick/3600)).padStart(2,'0')
  const mm = String(Math.floor((tick%3600)/60)).padStart(2,'0')
  const ss = String(tick%60).padStart(2,'0')
  const shownRound = game.displayRound ?? game.currentRound
  const deadlineSecs = game.voting.deadline ? Math.max(0, Math.floor((new Date(game.voting.deadline).getTime() - Date.now()) / 1000)) : 0
  const timerD = String(Math.floor(deadlineSecs / 86400)).padStart(2,'0')
  const timerH = String(Math.floor((deadlineSecs % 86400) / 3600)).padStart(2,'0')
  const timerM = String(Math.floor((deadlineSecs % 3600) / 60)).padStart(2,'0')
  const timerS = String(deadlineSecs % 60).padStart(2,'0')
  const titleParts = game.gameTitle ? game.gameTitle.split('/') : null
  const titleA = titleParts ? titleParts[0]?.trim() : 'HAWK'
  const titleB = titleParts ? titleParts[1]?.trim() : 'DOVE'

  const availableTabs: Tab[] = ['leaderboard', 'charts', 'pairings',
    ...(game.votingTabOpen ? ['vote' as Tab] : []),
    ...(game.newsboxTabOpen ? ['newsbox' as Tab] : []),
    ...(game.gazetteTabOpen ? ['gazette' as Tab] : []),
    ...(game.archiveTabOpen ? ['archive' as Tab] : []),
  ]

  async function handleVote() {
    if (!voteEmail || !voteChoice) { setVoteError('Please enter your email and choose a side.'); return }
    setVoteSubmitting(true); setVoteError('')
    const res = await fetch('/api/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:voteEmail, choice:voteChoice }) })
    const data = await res.json()
    if (!res.ok) { setVoteError(data.error || 'Something went wrong.'); setVoteSubmitting(false); return }
    setVoteDone(true); setVoteSubmitting(false)
  }

  const tabColor = (t: Tab) => {
    if (t === 'vote') return '#e8a020'
    if (t === 'newsbox') return 'var(--green)'
    if (t === 'gazette') return '#c8b890'
    if (t === 'archive') return '#8a9ab0'
    return 'var(--dove)'
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', fontFamily:'DM Mono,Courier New,monospace' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:500 }}>
          <span style={{ color:'var(--hawk)' }}>{titleA}</span>
          <span style={{ color:'var(--text-dim)', margin:'0 6px' }}>/</span>
          <span style={{ color:'var(--dove)' }}>{titleB}</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          {([['WEEK', game.week], ['ROUND', shownRound||'—'], ['ACTIVE', active.length], ['PTS', fmt(total)]] as [string,string|number][]).map(([l,v]) => (
            <div key={String(l)} style={{ textAlign:'center' }}>
              <div style={{ fontSize:9, color:'var(--text-dim)', letterSpacing:'0.2em' }}>{l}</div>
              <div style={{ fontSize:16, fontWeight:500, color:'var(--gold)' }}>{v}</div>
            </div>
          ))}
          {game.roundOpen
            ? <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 10px', border:'1px solid var(--dove)', fontSize:11, color:'var(--dove)' }}>
                <span style={{ animation:'pulse 1s infinite' }}>●</span> OPEN <span style={{ marginLeft:8, color:'var(--text-dim)' }}>{submitted}/{active.length}</span>
              </div>
            : <div style={{ padding:'4px 10px', border:'1px solid var(--border)', fontSize:11, color:'var(--text-dim)' }}>CLOSED</div>
          }
          <div style={{ fontSize:13, color:'var(--text-dim)', fontVariantNumeric:'tabular-nums' }}>{hh}:{mm}:{ss}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        {availableTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'9px 20px', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
              color: tab===t ? tabColor(t) : 'var(--text-dim)',
              borderBottom: tab===t ? `2px solid ${tabColor(t)}` : '2px solid transparent' }}>
            {t}
          </button>
        ))}
        <div style={{ flex:1 }} />
        <a href="/player" target="_blank" style={{ padding:'9px 16px', fontSize:11, letterSpacing:'0.1em', color:'var(--dove)', textDecoration:'none', display:'flex', alignItems:'center', borderLeft:'1px solid var(--border)' }}>↗ STUDENT</a>
        <a href="/admin" target="_blank" style={{ padding:'9px 16px', fontSize:11, letterSpacing:'0.1em', color:'var(--gold)', textDecoration:'none', display:'flex', alignItems:'center', borderLeft:'1px solid var(--border)' }}>↗ ADMIN</a>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding: (tab === 'gazette' || tab === 'archive') ? 0 : 20, minHeight:0 }}>

        {tab === 'gazette' && <GazetteReader game={game} mode="gazette" />}
        {tab === 'archive' && <GazetteReader game={game} mode="archive" />}

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
                    <div style={{ height:'100%', background:'var(--dove)', transition:'width 0.5s', width:`${active.length > 0 ? (submitted/active.length)*100 : 0}%`, borderRadius:2 }} />
                  </div>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {sorted.map((s,i) => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', border:'1px solid var(--border)', background:'var(--bg-card)', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, transition:'width 0.7s', width:`${(s.points/maxPts)*100}%`, opacity:0.08, background: s.choice==='hawk'?'var(--hawk)':s.choice==='dove'?'var(--dove)':'var(--text-dim)' }} />
                    <span style={{ fontSize:12, color:i===0?'var(--gold)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--text-dim)', width:20, textAlign:'right', flexShrink:0, position:'relative' }}>{i===0?'★':i+1}</span>
                    <span style={{ flex:1, fontSize:13, color:'var(--text)', position:'relative', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {s.name}{s.staplePartnerId && <span style={{ fontSize:10, color:'var(--gold)', marginLeft:6 }}>📌</span>}
                    </span>
                    {s.hasChosen && s.choice && <span style={{ fontSize:10, position:'relative', flexShrink:0, color:s.choice==='hawk'?'var(--hawk)':'var(--dove)' }}>{s.choice==='hawk'?'🦅':'🕊️'}</span>}
                    <span style={{ fontSize:14, fontWeight:500, color:'var(--gold)', position:'relative', flexShrink:0, minWidth:60, textAlign:'right' }}>{fmt(s.points)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
              {game.lastRound && (
                <div style={{ padding:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:10 }}>ROUND {shownRound||'—'} RESULTS</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto' }}>
                    {game.lastRound.pairings.filter(p => p.aId !== p.bId).map(p => {
                      const a = game.students.find(s => s.id === p.aId)
                      const b = game.students.find(s => s.id === p.bId)
                      const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--dove)':p.type==='STAPLED'?'var(--gold)':'var(--text-mid)'
                      return (
                        <div key={p.pairingId} style={{ fontSize:10, display:'flex', gap:4, alignItems:'center', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ color:tc, width:52, flexShrink:0, fontSize:9 }}>{p.type}</span>
                          <span style={{ flex:1, color:'var(--text-mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a?.name.split(',')[0]??'?'} vs {b?.name.split(',')[0]??'?'}</span>
                          <span style={{ color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)', flexShrink:0 }}>{p.aDelta>0?'+':''}{fmt(p.aDelta)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'charts' && <ChartsPanel game={game} />}

        {tab === 'pairings' && game.lastRound && (
          <div>
            <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:12 }}>ROUND {game.lastRound.round} — ALL PAIRINGS</div>
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
                      <span style={{ fontSize:12, color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)' }}>{p.aDelta>0?'+':''}{fmt(p.aDelta)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:12, color:'var(--text)' }}>{b?.name.split(',')[0]??'?'}</span>
                      <span style={{ fontSize:12, color:p.bDelta>0?'var(--green)':p.bDelta<0?'var(--hawk)':'var(--text-dim)' }}>{p.bDelta>0?'+':''}{fmt(p.bDelta)}</span>
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-dim)', lineHeight:1.4 }}>{p.note}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'vote' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}>
            <div style={{ maxWidth:520 }}>
              <div style={{ fontSize:16, fontWeight:500, marginBottom:6 }}>Cast your vote</div>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:18, lineHeight:1.9 }}>You may vote once. Enter your registered email to confirm your identity. Results are hidden until voting closes. Made a mistake? Email your instructor.</div>
              {voteDone ? (
                <div style={{ padding:'16px 20px', background:'var(--green-bg)', border:'1px solid var(--green)', fontSize:13, color:'var(--green)' }}>✓ Vote recorded. You cannot vote again.</div>
              ) : !game.voting.open ? (
                <div style={{ padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:13, color:'var(--text-dim)' }}>Voting is currently closed.</div>
              ) : (
                <>
                  {game.voting.presidentId && (() => {
                    const p = game.students.find(s => s.id === game.voting.presidentId)
                    if (!p) return null
                    return (
                      <div style={{ marginBottom:18, padding:'16px 20px', background:'var(--bg-card)', border:'1px solid var(--border-hi)', position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(232,160,32,0.04),transparent 60%)', pointerEvents:'none' }} />
                        <div style={{ fontSize:9, letterSpacing:'.25em', color:'var(--text-dim)', marginBottom:6, textTransform:'uppercase' }}>Candidate</div>
                        <div style={{ fontSize:22, fontWeight:500, color:'var(--text)', marginBottom: game.voting.presidentTitle ? 4 : 8 }}>{p.name.includes(',') ? p.name.split(',').slice(1).join(',').trim()+' '+p.name.split(',')[0] : p.name}</div>
                        {game.voting.presidentTitle && <div style={{ fontSize:11, color:'var(--gold)', letterSpacing:'.1em', marginBottom:6, textTransform:'uppercase' }}>{game.voting.presidentTitle}</div>}
                        <div style={{ fontSize:13, color:'var(--text-dim)' }}><span style={{ color:'var(--gold)', fontWeight:500 }}>{fmt(p.points)}</span> pts</div>
                      </div>
                    )
                  })()}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:5 }}>YOUR EMAIL</div>
                    <input className="input" placeholder="your@email.edu" value={voteEmail} onChange={e => setVoteEmail(e.target.value)} />
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:8 }}>CHOOSE YOUR SIDE</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {[{key:'a',label:game.voting.optionA,color:'#e8a020',bg:'#1e1408'},{key:'b',label:game.voting.optionB,color:'#7F77DD',bg:'#0e0d20'}].map(opt => (
                        <div key={opt.key} onClick={() => setVoteChoice(opt.key)}
                          style={{ background:voteChoice===opt.key?opt.bg:'var(--bg-raised)', border:`1px solid ${voteChoice===opt.key?opt.color:'var(--border-hi)'}`, padding:18, textAlign:'center', cursor:'pointer', transition:'all .15s' }}>
                          <div style={{ fontSize:18, fontWeight:500, color:opt.color, marginBottom:4 }}>{opt.label}</div>
                          <div style={{ fontSize:10, letterSpacing:'.12em', color:'var(--text-dim)', textTransform:'uppercase' }}>Vote for {opt.label.toLowerCase()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {game.voting.deadline && (
                    <>
                      <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:8 }}>VOTING CLOSES IN</div>
                      <div style={{ display:'flex', gap:8, marginBottom:18 }}>
                        {[[timerD,'Days'],[timerH,'Hours'],[timerM,'Mins'],[timerS,'Secs']].map(([v,l]) => (
                          <div key={l} style={{ textAlign:'center', background:'var(--bg-raised)', border:'1px solid var(--border-hi)', padding:'8px 10px', minWidth:52 }}>
                            <div style={{ fontSize:22, fontWeight:500, color:'var(--gold)' }}>{v}</div>
                            <div style={{ fontSize:9, letterSpacing:'.15em', color:'var(--text-dim)', textTransform:'uppercase', marginTop:2 }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {voteError && <div style={{ marginBottom:10, padding:'8px 12px', background:'var(--hawk-bg)', border:'1px solid var(--hawk)', fontSize:12, color:'var(--hawk)' }}>{voteError}</div>}
                  <button className="btn" onClick={handleVote} disabled={voteSubmitting} style={{ width:'100%', padding:12, fontSize:12, borderColor:'#e8a020', color:'#e8a020' }}>
                    {voteSubmitting ? 'Submitting...' : 'Submit vote →'}
                  </button>
                </>
              )}
            </div>
            <div>
              <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:8 }}>NEWSBOX</div>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:12, maxHeight:500, overflowY:'auto' }}>
                {game.newsItems.length === 0
                  ? <div style={{ fontSize:12, color:'var(--text-dim)', padding:'8px 0' }}>No posts yet.</div>
                  : game.newsItems.map(item => (
                    <div key={item.id} style={{ paddingBottom:10, borderBottom:'1px solid var(--border)', marginBottom:10 }}>
                      <div style={{ fontSize:10, letterSpacing:'.1em', color:'var(--text-dim)', marginBottom:4 }}>ADMIN · {timeAgo(item.createdAt)}</div>
                      <div style={{ fontSize:12, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: item.html }} />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'newsbox' && (
          <div style={{ maxWidth:680 }}>
            <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:12 }}>NEWSBOX</div>
            {game.newsItems.length === 0
              ? <div style={{ fontSize:13, color:'var(--text-dim)' }}>No posts yet.</div>
              : game.newsItems.map(item => (
                <div key={item.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', padding:14, marginBottom:10 }}>
                  <div style={{ fontSize:10, letterSpacing:'.1em', color:'var(--text-dim)', marginBottom:6 }}>ADMIN · {timeAgo(item.createdAt)}</div>
                  <div style={{ fontSize:13, lineHeight:1.8 }} dangerouslySetInnerHTML={{ __html: item.html }} />
                </div>
              ))}
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
  const eliminated = game.students.filter(s => s.isEliminated)
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
    `Top 20% control ${top20share}% of all pts.`,
  ]
  const buckets = [
    { label:'0', count: active.filter(s=>s.points===0).length },
    { label:'1–99', count: active.filter(s=>s.points>0&&s.points<100).length },
    { label:'100–299', count: active.filter(s=>s.points>=100&&s.points<300).length },
    { label:'300–599', count: active.filter(s=>s.points>=300&&s.points<600).length },
    { label:'600+', count: active.filter(s=>s.points>=600).length },
  ]
  const maxBucket = Math.max(...buckets.map(b=>b.count), 1)
  const roundGains = lastRound ? active.map(s => ({ name: s.name.split(',')[0], delta: (lastRound.snapshotAfter[s.name]??s.points)-(lastRound.snapshotBefore[s.name]??s.points) })).sort((a,b)=>b.delta-a.delta) : []
  const topGainers = roundGains.slice(0,5)
  const topLosers = [...roundGains].sort((a,b)=>a.delta-b.delta).slice(0,5)
  const maxDelta = Math.max(...roundGains.map(g=>Math.abs(g.delta)), 1)
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {quotes.map((q,i) => (
          <div key={i} style={{ padding:14, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:9, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:6 }}>INSIGHT {i+1}</div>
            <div style={{ fontSize:13, color:'var(--gold)', lineHeight:1.5 }}>"{q}"</div>
          </div>
        ))}
      </div>
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>POINTS DISTRIBUTION</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {buckets.map(b => (
            <div key={b.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:60, fontSize:11, color:'var(--text-dim)', textAlign:'right', flexShrink:0 }}>{b.label}</div>
              <div style={{ flex:1, height:20, background:'var(--bg-raised)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s', width:`${(b.count/maxBucket)*100}%`, background:b.label==='0'?'var(--hawk-bg)':'var(--dove-bg)', borderRight:`2px solid ${b.label==='0'?'var(--hawk)':'var(--dove)'}` }} />
                <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', fontSize:11, color:'var(--text-mid)' }}>{b.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ALL PLAYERS — POINTS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto' }}>
          {sorted.map((s,i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:110, fontSize:11, color:i===0?'var(--gold)':'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name.split(',')[0]}</div>
              <div style={{ flex:1, height:14, background:'var(--bg-raised)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s', width:`${(s.points/maxPts)*100}%`, background:s.choice==='hawk'?'var(--hawk-bg)':s.choice==='dove'?'var(--dove-bg)':'var(--bg)', borderRight:`2px solid ${s.choice==='hawk'?'var(--hawk)':s.choice==='dove'?'var(--dove)':'var(--border-hi)'}` }} />
              </div>
              <div style={{ width:55, textAlign:'right', fontSize:11, color:'var(--gold)', fontWeight:500 }}>{fmt(s.points)}</div>
            </div>
          ))}
        </div>
      </div>
      {lastRound && topGainers.length > 0 && (
        <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ROUND {lastRound.round} — TOP GAINERS</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topGainers.map(g => (
              <div key={g.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:100, fontSize:11, color:'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                <div style={{ flex:1, height:16, background:'var(--bg-raised)', position:'relative' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s', width:`${(Math.max(g.delta,0)/maxDelta)*100}%`, background:'var(--green-bg)', borderRight:'2px solid var(--green)' }} />
                </div>
                <div style={{ width:60, textAlign:'right', fontSize:12, color:'var(--green)', fontWeight:500 }}>{g.delta>0?'+':''}{fmt(g.delta)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {lastRound && topLosers.length > 0 && (
        <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:14 }}>ROUND {lastRound.round} — BIGGEST LOSSES</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {topLosers.filter(g=>g.delta<0).map(g => (
              <div key={g.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:100, fontSize:11, color:'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                <div style={{ flex:1, height:16, background:'var(--bg-raised)', position:'relative' }}>
                  <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.6s', width:`${(Math.abs(g.delta)/maxDelta)*100}%`, background:'var(--hawk-bg)', borderRight:'2px solid var(--hawk)' }} />
                </div>
                <div style={{ width:60, textAlign:'right', fontSize:12, color:'var(--hawk)', fontWeight:500 }}>{fmt(g.delta)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding:16, background:'var(--bg-card)', border:'1px solid var(--border)', gridColumn:'1/-1' }}>
        <div style={{ fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', marginBottom:24 }}>HAWK vs DOVE — AVERAGE POINTS</div>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', height:100 }}>
          {[{label:`🦅 Hawks (${hawks.length})`,avg:hawkAvg,color:'var(--hawk)',bg:'var(--hawk-bg)'},{label:`🕊️ Doves (${doves.length})`,avg:doveAvg,color:'var(--dove)',bg:'var(--dove-bg)'}].map(bar => {
            const maxAvg = Math.max(hawkAvg, doveAvg, 1)
            const h = Math.round((bar.avg/maxAvg)*70)
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
            <div style={{ width:60, height:Math.max(Math.round((eliminated.length/Math.max(game.students.length,1))*70),4), background:'rgba(232,55,42,0.08)', border:'1px solid rgba(232,55,42,0.3)', transition:'height 0.6s' }} />
            <div style={{ fontSize:11, color:'var(--text-dim)' }}>💀 Eliminated</div>
          </div>
        </div>
      </div>
    </div>
  )
}
