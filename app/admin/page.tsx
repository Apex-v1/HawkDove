'use client'
import { useState, useEffect, useCallback } from 'react'

type Tab = 'roster' | 'round' | 'history' | 'insights' | 'voting' | 'newsbox'

interface Student {
  id: string; name: string; email: string; tiebreaker: number; points: number
  hasChosen: boolean; choice?: string; isEliminated: boolean
  staplePartnerId?: string; isHawkInStaple?: boolean; stapleTransferAmount?: number
  voteChoice?: string
  roundHistory?: { round: number; type: string; pair: string; result: string }[]
}
interface Pairing {
  pairingId: string; type: string; aId: string; bId: string
  aChoice: string; bChoice: string; aDelta: number; bDelta: number; note: string
}
interface RoundRecord {
  round: number; week: number; phase: string; pairings: Pairing[]
  snapshotBefore: Record<string,number>; snapshotAfter: Record<string,number>
  computedAt: string; finalizedAt?: string
}
interface NewsItem { id: string; html: string; createdAt: string }
interface VotingState { open: boolean; optionA: string; optionB: string; deadline: string; resultsRevealed: boolean; votedEmails: string[] }
interface GameState {
  week: number; currentRound: number; displayRound?: number; students: Student[]
  rounds: RoundRecord[]; roundOpen: boolean; pendingRound?: RoundRecord
  gameTitle?: string
  voting: VotingState
  votingTabOpen: boolean
  newsboxTabOpen: boolean
  newsItems: NewsItem[]
}

function fmt(n: number) {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

function downloadCSV(students: Student[], rounds: RoundRecord[]) {
  const sorted = [...students].sort((a, b) => b.points - a.points)
  const headers = ['Rank', 'Name', 'Email', 'Points', 'Tiebreaker', 'Choice', 'Stapled', 'Hawk In Staple', 'Eliminated']
  const rows = sorted.map((s, i) => [
    i + 1,
    `"${s.name}"`,
    `"${s.email}"`,
    fmt(s.points),
    s.tiebreaker,
    s.choice || '',
    s.staplePartnerId ? 'Yes' : 'No',
    s.isHawkInStaple ? 'Hawk' : s.staplePartnerId ? 'Dove' : '',
    s.isEliminated ? 'Yes' : 'No',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hawk-dove-round${rounds.length}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [state, setState] = useState<GameState | null>(null)
  const [tab, setTab] = useState<Tab>('roster')
  const [loading, setLoading] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string,string>>({})
  const [stapleA, setStapleA] = useState('')
  const [stapleB, setStapleB] = useState('')
  const [stapleHawk, setStapleHawk] = useState('')
  const [editDeltas, setEditDeltas] = useState<Record<string,{a:string,b:string}>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [displayRoundInput, setDisplayRoundInput] = useState('')
  const [sortKey, setSortKey] = useState<'name'|'email'|'points'|'tiebreaker'|'choice'|'status'>('points')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')
  const [adjustId, setAdjustId] = useState<string|null>(null)
  const [adjustVal, setAdjustVal] = useState('')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', email: '', tiebreaker: '0', points: '0' })
  // Voting state
  const [votingOptionA, setVotingOptionA] = useState('Support')
  const [votingOptionB, setVotingOptionB] = useState('Fight')
  const [votingDeadline, setVotingDeadline] = useState('')
  const [presidentId, setPresidentId] = useState('')
  const [presidentTitle, setPresidentTitle] = useState('')
  const [gameTitleInput, setGameTitleInput] = useState('')
  // Newsbox state
  const [newsEditor, setNewsEditor] = useState('')
  const [newsEditorRef, setNewsEditorRef] = useState<HTMLDivElement|null>(null)

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/admin/control', { cache: 'no-store' })
    if (res.status === 401) { setAuthed(false); return }
    const data = await res.json()
    setState(data.state)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchState()
    const iv = setInterval(fetchState, 4000)
    return () => clearInterval(iv)
  }, [authed, fetchState])

  useEffect(() => {
    if (state) {
      if (displayRoundInput === '') setDisplayRoundInput(String(state.displayRound ?? state.currentRound))
      if (state.voting) {
        setVotingOptionA(state.voting.optionA || 'Support')
        setVotingOptionB(state.voting.optionB || 'Fight')
        setVotingDeadline(state.voting.deadline || '')
      }
      if (gameTitleInput === '' && state.gameTitle) setGameTitleInput(state.gameTitle)
    }
  }, [state])

  async function login() {
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: pw }) })
    if (res.ok) { setAuthed(true); setPwErr('') } else setPwErr('Wrong password')
  }

  async function act(action: string, payload: Record<string,unknown> = {}) {
    setLoading(action)
    const res = await fetch('/api/admin/control', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action, payload }) })
    const data = await res.json()
    if (data.state) setState(data.state)
    setLoading('')
    return data
  }

  async function handleXlsx(file: File) {
    setUploading(true); setUploadMsg('')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.error) { setUploadMsg('Error: ' + data.error) }
    else { setUploadMsg(`Loaded ${data.count} students`); await fetchState() }
    setUploading(false)
  }

  function startEdit(s: Student) {
    setEditingId(s.id)
    setEditFields({ name: s.name, email: s.email, points: String(s.points), tiebreaker: String(s.tiebreaker), choice: s.choice || '' })
  }

  async function saveEdit(id: string) {
    await act('update_student', {
      id,
      name: editFields.name,
      email: editFields.email,
      points: parseFloat(editFields.points) || 0,
      tiebreaker: parseFloat(editFields.tiebreaker) || 0,
    })
    if (editFields.choice !== undefined) {
      await act('override_choice', { id, choice: editFields.choice || null })
    }
    setEditingId(null)
  }

  function sortedStudents(students: Student[]) {
    return [...students].sort((a, b) => {
      let av: string|number = '', bv: string|number = ''
      if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'email') { av = a.email; bv = b.email }
      else if (sortKey === 'points') { av = a.points; bv = b.points }
      else if (sortKey === 'tiebreaker') { av = a.tiebreaker; bv = b.tiebreaker }
      else if (sortKey === 'choice') { av = a.choice || ''; bv = b.choice || '' }
      else if (sortKey === 'status') { av = a.isEliminated ? 1 : 0; bv = b.isEliminated ? 1 : 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  async function addStaple() {
    if (!stapleA || !stapleB || !stapleHawk) return
    await act('set_staple', { aId: stapleA, bId: stapleB, hawkId: stapleHawk })
    setStapleA(''); setStapleB(''); setStapleHawk('')
  }

  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:320 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:24, fontWeight:500 }}>
            <span style={{ color:'var(--hawk)' }}>HAWK</span>
            <span style={{ color:'var(--text-dim)', margin:'0 8px' }}>/</span>
            <span style={{ color:'var(--dove)' }}>DOVE</span>
          </div>
          <div className="label" style={{ marginTop:6 }}>Admin Panel</div>
        </div>
        <div className="card" style={{ padding:20 }}>
          <input type="password" className="input" placeholder="Password" value={pw}
            onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} autoFocus />
          {pwErr && <div style={{ color:'var(--hawk)', fontSize:12, marginTop:8 }}>{pwErr}</div>}
          <button className="btn btn-gold" style={{ width:'100%', marginTop:12, padding:12 }} onClick={login}>Enter →</button>
        </div>
      </div>
    </div>
  )

  if (!state) return <div style={{ padding:32, color:'var(--text-dim)' }}>Loading...</div>

  const active = state.students.filter(s => !s.isEliminated)
  const submitted = active.filter(s => s.hasChosen).length
  const stapledPairs = state.students.filter(s => s.staplePartnerId && s.isHawkInStaple)

  return (
    <div style={{ minHeight:'100vh', padding:20, maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:17, fontWeight:500 }}>
          <span style={{ color:'var(--hawk)' }}>HAWK</span>
          <span style={{ color:'var(--text-dim)', margin:'0 6px' }}>/</span>
          <span style={{ color:'var(--dove)' }}>DOVE</span>
          <span style={{ color:'var(--text-dim)', fontSize:12, marginLeft:10 }}>Admin</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {([['Week', state.week], ['Round', state.currentRound], ['Active', active.length], [`${submitted}/${active.length}`, 'submitted']] as [string|number, string|number][]).map(([v,l]) => (
            <div key={String(l)} style={{ display:'flex', gap:5, alignItems:'center', padding:'3px 9px', background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:12 }}>
              <span style={{ color:'var(--text-dim)', fontSize:10 }}>{l}</span>
              <span style={{ color:'var(--gold)', fontWeight:500 }}>{v}</span>
            </div>
          ))}
          {state.roundOpen && <span className="tag tag-dove pulse">● OPEN</span>}
          {state.pendingRound && <span className="tag tag-gold">⏳ REVIEW</span>}
          <a href="/display" target="_blank" style={{ fontSize:10, color:'var(--dove)', textDecoration:'none', padding:'4px 9px', border:'1px solid var(--dove-bg)', display:'flex', alignItems:'center' }}>📊 Display</a>
          <button className="btn btn-ghost" style={{ fontSize:10, padding:'4px 9px' }}
            onClick={() => downloadCSV(state.students, state.rounds)}>⬇ Export CSV</button>
          <button className="btn btn-danger" style={{ fontSize:10, padding:'4px 9px' }} onClick={() => { if (confirm('Reset everything?')) act('reset') }}>Reset</button>
        </div>
      </div>

      {/* Round controls */}
      <div className="card" style={{ padding:12, marginBottom:14, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <span className="label" style={{ marginRight:4 }}>Week:</span>
        {[1,2].map(w => (
          <button key={w} className={`btn ${state.week===w?'btn-gold':'btn-ghost'}`} style={{ padding:'5px 12px', fontSize:11 }}
            onClick={() => act('set_week',{week:w})}>W{w}</button>
        ))}
        <div style={{ width:1, height:20, background:'var(--border)', margin:'0 4px' }} />
        {!state.roundOpen && !state.pendingRound && (
          <button className="btn btn-dove" style={{ padding:'7px 14px', fontSize:12 }} onClick={() => act('open_round')} disabled={!!loading}>
            ▶ Open Round {state.currentRound + 1}
          </button>
        )}
        {state.roundOpen && <>
          <button className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:12 }} onClick={() => act('close_round')}>Close</button>
          <button className="btn btn-gold" style={{ padding:'7px 14px', fontSize:12 }}
            onClick={async () => { await act('compute_round'); setTab('round') }} disabled={!!loading}>
            ⚡ Compute
          </button>
        </>}
        {state.pendingRound && <>
          <button className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:12 }}
            onClick={async () => { await act('rerandomize'); setTab('round') }} disabled={!!loading}
            title="Reshuffle pairings with a new random seed">
            🔀 Re-randomize
          </button>
          <button className="btn btn-hawk" style={{ padding:'7px 14px', fontSize:12 }}
            onClick={async () => { await act('finalize_round'); setTab('history') }} disabled={!!loading}>
            ✓ Finalize & Push
          </button>
        </>}
        <div style={{ width:1, height:20, background:'var(--border)', margin:'0 4px' }} />
        <span className="label" style={{ fontSize:10 }}>Display Round:</span>
        <input type="number" className="input" style={{ width:60, padding:'4px 8px', fontSize:12 }}
          value={displayRoundInput} onChange={e => setDisplayRoundInput(e.target.value)} />
        <button className="btn btn-ghost" style={{ padding:'5px 10px', fontSize:11 }}
          onClick={() => act('set_display_round', { round: parseInt(displayRoundInput) || 0 })}>Set</button>
        <span style={{ fontSize:10, color:'var(--text-dim)' }}>(shown on display)</span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:14 }}>
        {(['roster','round','history','insights'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase',
              background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
              color: tab===t ? 'var(--text)' : 'var(--text-dim)',
              borderBottom: tab===t ? '2px solid var(--dove)' : '2px solid transparent' }}>
            {t==='round' && state.pendingRound ? '⏳ Review' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
        <button onClick={() => setTab('voting')}
          style={{ padding:'8px 16px', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase',
            background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
            color: tab==='voting' ? '#e8a020' : 'var(--text-dim)',
            borderBottom: tab==='voting' ? '2px solid #e8a020' : '2px solid transparent' }}>
          Voting {state.votingTabOpen ? '●' : ''}
        </button>
        <button onClick={() => setTab('newsbox')}
          style={{ padding:'8px 16px', fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase',
            background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit',
            color: tab==='newsbox' ? 'var(--green)' : 'var(--text-dim)',
            borderBottom: tab==='newsbox' ? '2px solid var(--green)' : '2px solid transparent' }}>
          Newsbox {state.newsboxTabOpen ? '●' : ''}
        </button>
      </div>

      {/* ── ROSTER TAB ── */}
      {tab==='roster' && (
        <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:14, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Upload */}
            <div className="card" style={{ padding:14 }}>
              <div className="label" style={{ marginBottom:10 }}>Upload Roster (.xlsx)</div>
              <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:10, lineHeight:1.7 }}>
                Upload your spreadsheet directly. Reads columns:<br/>
                <span style={{ color:'var(--dove)' }}>Name, Email, Tiebreaker, Points</span><br/>
                Also imports: Round Type, Round Result, Round Pair.
              </div>
              <label style={{ display:'block', padding:'18px 12px', border:'1px dashed var(--border-hi)', textAlign:'center',
                cursor:'pointer', fontSize:12, color:'var(--text-dim)', transition:'all 0.12s' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleXlsx(f) }}>
                <input type="file" accept=".xlsx,.xls" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleXlsx(f) }} />
                {uploading ? 'Uploading...' : 'Drop .xlsx here or click to browse'}
              </label>
              {uploadMsg && <div style={{ marginTop:8, fontSize:11, color: uploadMsg.startsWith('Error') ? 'var(--hawk)' : 'var(--green)' }}>{uploadMsg}</div>}
            </div>

            {/* Staple manager */}
            <div className="card" style={{ padding:14 }}>
              <div className="label" style={{ marginBottom:10 }}>Protectorate / Staple Pairs</div>
              {state.students.length === 0
                ? <div style={{ color:'var(--text-dim)', fontSize:12 }}>Upload roster first.</div>
                : <>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                    {[
                      [stapleA, setStapleA, 'Player A...'],
                      [stapleB, setStapleB, 'Player B...'],
                    ].map(([val, setter, ph]) => (
                      <select key={ph as string} className="input" style={{ fontSize:12 }}
                        value={val as string} onChange={e => (setter as (v:string)=>void)(e.target.value)}>
                        <option value="">{ph as string}</option>
                        {state.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    ))}
                    <select className="input" style={{ fontSize:12 }} value={stapleHawk} onChange={e => setStapleHawk(e.target.value)}>
                      <option value="">Who is Hawk?</option>
                      {[stapleA,stapleB].filter(Boolean).map(id => {
                        const s = state.students.find(x => x.id === id)
                        return s ? <option key={s.id} value={s.id}>{s.name}</option> : null
                      })}
                    </select>
                    <button className="btn btn-gold" style={{ padding:8, fontSize:11 }} onClick={addStaple} disabled={!stapleA||!stapleB||!stapleHawk}>
                      📌 Create Protectorate
                    </button>
                  </div>
                  {stapledPairs.length === 0
                    ? <div style={{ fontSize:11, color:'var(--text-dim)' }}>No protectorates yet.</div>
                    : stapledPairs.map(hawk => {
                      const dove = state.students.find(s => s.id === hawk.staplePartnerId)
                      if (!dove) return null
                      return (
                        <div key={hawk.id} className="card-raised" style={{ padding:10, marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                            <span style={{ fontSize:12 }}>
                              <span style={{ color:'var(--hawk)' }}>🦅 {hawk.name.split(',')[0]}</span>
                              <span style={{ color:'var(--text-dim)', margin:'0 5px' }}>↔</span>
                              <span style={{ color:'var(--dove)' }}>🕊️ {dove.name.split(',')[0]}</span>
                            </span>
                            <button className="btn btn-danger" style={{ fontSize:9, padding:'2px 7px' }} onClick={() => act('remove_staple',{id:hawk.id})}>✕</button>
                          </div>
                         <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, color:'var(--text-dim)' }}>Hawk returns:</span>
                            <input type="number" className="input" style={{ width:70, padding:'3px 7px', fontSize:12 }}
                              placeholder="0 pts" defaultValue={hawk.stapleTransferAmount ?? ''}
                              onBlur={e => act('set_staple_transfer',{hawkId:hawk.id, amount:parseFloat(e.target.value)||0})} />
<span style={{ fontSize:11, color:'var(--text-dim)' }}>pts — OR —</span>
<input type="number" className="input" style={{ width:55, padding:'3px 7px', fontSize:12 }}
  placeholder="%" min={0} max={100}
  onKeyDown={e => {
    if (e.key !== 'Enter') return
    const pct = parseFloat((e.target as HTMLInputElement).value)
    if (isNaN(pct)) return
    const dove = state.students.find(x => x.id === hawk.staplePartnerId)
    if (!dove) return
    const taken = Math.round(dove.points * 0.25 * 3 * 100) / 100
    const amount = Math.round(taken * (pct / 100) * 100) / 100
    act('set_staple_transfer', { hawkId: hawk.id, amount })
  }}
  onBlur={e => {
    const pct = parseFloat(e.target.value)
    if (isNaN(pct)) return
    const dove = state.students.find(x => x.id === hawk.staplePartnerId)
    if (!dove) return
    const taken = Math.round(dove.points * 0.25 * 3 * 100) / 100
    const amount = Math.round(taken * (pct / 100) * 100) / 100
    act('set_staple_transfer', { hawkId: hawk.id, amount })
  }} />
<span style={{ fontSize:11, color:'var(--text-dim)' }}>% of what Hawk took</span>
                          </div>
                        </div>
                      )
                    })}
                </>}
            </div>
          </div>

          {/* Student table with inline editing */}
          <div className="card" style={{ padding:14, display:'flex', flexDirection:'column', minHeight:0, flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div className="label">{state.students.length} Students</div>
              <div style={{ fontSize:11, color:'var(--text-dim)' }}>Click any row to edit · Click 💀 to toggle eliminated</div>
            </div>
            <div style={{ overflowX:'auto', overflowY:'auto', flex:1, minHeight:0 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead style={{ position:'sticky', top:0, background:'var(--bg-card)' }}>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    <th style={{ padding:'5px 8px', color:'var(--text-dim)', fontWeight:400, fontSize:10 }}>#</th>
                    {(['name','email','tiebreaker','points','choice'] as const).map(k => (
                      <th key={k} onClick={() => toggleSort(k)}
                        style={{ padding:'5px 8px', textAlign:'left', color: sortKey===k ? 'var(--dove)' : 'var(--text-dim)',
                          fontWeight:400, fontSize:10, letterSpacing:'0.12em', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}>
                        {k==='tiebreaker'?'TB':k.charAt(0).toUpperCase()+k.slice(1)}{sortKey===k?(sortDir==='asc'?' ↑':' ↓'):''}
                      </th>
                    ))}
                    <th style={{ padding:'5px 8px', color:'var(--text-dim)', fontWeight:400, fontSize:10 }}>Stapled</th>
                    <th onClick={() => toggleSort('status')}
                      style={{ padding:'5px 8px', color: sortKey==='status' ? 'var(--dove)' : 'var(--text-dim)',
                        fontWeight:400, fontSize:10, cursor:'pointer', userSelect:'none' }}>
                      Elim{sortKey==='status'?(sortDir==='asc'?' ↑':' ↓'):''}
                    </th>
                    <th style={{ padding:'5px 8px', color:'var(--text-dim)', fontWeight:400, fontSize:10 }}></th>
                    <th style={{ padding:'5px 8px', color:'var(--text-dim)', fontWeight:400, fontSize:10 }}>+/−</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents(state.students).map((s,i) => (
                    editingId === s.id ? (
                      <tr key={s.id} style={{ background:'rgba(232,160,32,0.06)', borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'5px 8px', color:'var(--text-dim)' }}>{i+1}</td>
                        <td style={{ padding:'4px 6px' }}><input className="input" style={{ padding:'3px 7px', fontSize:11 }} value={editFields.name} onChange={e=>setEditFields(p=>({...p,name:e.target.value}))} /></td>
                        <td style={{ padding:'4px 6px' }}><input className="input" style={{ padding:'3px 7px', fontSize:11 }} value={editFields.email} onChange={e=>setEditFields(p=>({...p,email:e.target.value}))} /></td>
                        <td style={{ padding:'4px 6px' }}><input type="number" className="input" style={{ padding:'3px 7px', fontSize:11, width:50 }} value={editFields.tiebreaker} onChange={e=>setEditFields(p=>({...p,tiebreaker:e.target.value}))} /></td>
                        <td style={{ padding:'4px 6px' }}><input type="number" className="input" style={{ padding:'3px 7px', fontSize:11, width:80 }} value={editFields.points} onChange={e=>setEditFields(p=>({...p,points:e.target.value}))} /></td>
                        <td style={{ padding:'4px 6px' }}>
                          <select className="input" style={{ padding:'3px 6px', fontSize:11 }}
                            value={editFields.choice} onChange={e=>setEditFields(p=>({...p,choice:e.target.value}))}>
                            <option value="">— none —</option>
                            <option value="hawk">🦅 Hawk</option>
                            <option value="dove">🕊️ Dove</option>
                          </select>
                        </td>
                        <td colSpan={3} />
                        <td style={{ padding:'4px 6px' }}>
                          <div style={{ display:'flex', gap:4 }}>
                            <button className="btn btn-gold" style={{ padding:'3px 8px', fontSize:10 }} onClick={() => saveEdit(s.id)}>Save</button>
                            <button className="btn btn-ghost" style={{ padding:'3px 8px', fontSize:10 }} onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', opacity:s.isEliminated?0.4:1 }}>
                        <td style={{ padding:'5px 8px', color:i===0?'var(--gold)':'var(--text-dim)', fontSize:11 }}>{i===0?'★':i+1}</td>
                        <td style={{ padding:'5px 8px', color:'var(--text)', cursor:'pointer' }} onClick={() => startEdit(s)}>{s.name}</td>
                        <td style={{ padding:'5px 8px', color:'var(--text-dim)', fontSize:11, cursor:'pointer' }} onClick={() => startEdit(s)}>{s.email}</td>
                        <td style={{ padding:'5px 8px', color:'var(--text-mid)', textAlign:'center', cursor:'pointer' }} onClick={() => startEdit(s)}>{s.tiebreaker}</td>
                        <td style={{ padding:'5px 8px', color:'var(--gold)', fontWeight:500, cursor:'pointer' }} onClick={() => startEdit(s)}>{fmt(s.points)}</td>
                        <td style={{ padding:'5px 8px', cursor:'pointer' }} onClick={() => startEdit(s)}>
                          {s.choice ? <span className={`tag tag-${s.choice}`} style={{ fontSize:10 }}>{s.choice[0].toUpperCase()}</span> : <span style={{ color:'var(--text-dim)' }}>—</span>}
                        </td>
                        <td style={{ padding:'5px 8px' }}>{s.staplePartnerId ? <span className="tag tag-staple" style={{ fontSize:10 }}>{s.isHawkInStaple?'🦅':'🕊️'}</span> : '—'}</td>
                        <td style={{ padding:'5px 8px' }}>
                          <button onClick={() => act('toggle_eliminated', { id: s.id })}
                            style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:14, padding:'0 2px' }}
                            title="Toggle eliminated">
                            {s.isEliminated ? '💀' : <span style={{ color:'var(--text-dim)', fontSize:11 }}>—</span>}
                          </button>
                        </td>
                        <td style={{ padding:'5px 8px' }}><span style={{ fontSize:10, color:'var(--text-dim)', cursor:'pointer' }} onClick={() => startEdit(s)}>edit</span></td>
                        <td style={{ padding:'4px 6px' }} onClick={e => e.stopPropagation()}>
                          {adjustId === s.id ? (
                            <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                              <input type="number" className="input" style={{ width:60, padding:'2px 5px', fontSize:11 }}
                                placeholder="±pts" value={adjustVal}
                                onChange={e => setAdjustVal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const delta = parseFloat(adjustVal)
                                    if (!isNaN(delta)) act('update_student', { id: s.id, name: s.name, email: s.email, tiebreaker: s.tiebreaker, points: Math.round((s.points + delta) * 100) / 100 })
                                    setAdjustId(null); setAdjustVal('')
                                  }
                                  if (e.key === 'Escape') { setAdjustId(null); setAdjustVal('') }
                                }} autoFocus />
                              <button className="btn btn-gold" style={{ padding:'2px 6px', fontSize:10 }}
                                onClick={() => {
                                  const delta = parseFloat(adjustVal)
                                  if (!isNaN(delta)) act('update_student', { id: s.id, name: s.name, email: s.email, tiebreaker: s.tiebreaker, points: Math.round((s.points + delta) * 100) / 100 })
                                  setAdjustId(null); setAdjustVal('')
                                }}>✓</button>
                              <button className="btn btn-ghost" style={{ padding:'2px 6px', fontSize:10 }}
                                onClick={() => { setAdjustId(null); setAdjustVal('') }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAdjustId(s.id); setAdjustVal('') }}
                              style={{ background:'transparent', border:'1px solid var(--border)', cursor:'pointer',
                                fontSize:11, color:'var(--text-dim)', padding:'2px 7px', fontFamily:'inherit' }}>
                              ±
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ROUND REVIEW TAB ── */}
      {tab==='round' && (
        <div>
          {!state.pendingRound
            ? <div style={{ color:'var(--text-dim)', fontSize:13 }}>No round pending. Compute a round first.</div>
            : <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div>
                  <div className="label">Round {state.pendingRound.round} — Pending Review</div>
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>Computed {new Date(state.pendingRound.computedAt).toLocaleTimeString()}. Edit deltas if needed, then finalize.</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:12 }}
                    onClick={async () => { await act('rerandomize') }} disabled={!!loading}
                    title="Reshuffle all pairings with a new random seed">
                    🔀 Re-randomize
                  </button>
                  <button className="btn btn-hawk" style={{ padding:'9px 18px' }}
                    onClick={async () => { await act('finalize_round'); setTab('history') }}>
                    ✓ Finalize & Push Results
                  </button>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['#','Type','Player A','Play','Before','Delta → After','Player B','Play','Before','Delta → After','Note','Edit'].map(h => (
                        <th key={h} style={{ padding:'5px 7px', textAlign:'left', color:'var(--text-dim)', fontWeight:400, fontSize:10, letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.pendingRound.pairings.map((p,i) => {
                      const a = state.students.find(s=>s.id===p.aId)
                      const b = state.students.find(s=>s.id===p.bId)
                      const aAfter = state.pendingRound!.snapshotAfter[a?.name??'']
                      const bAfter = state.pendingRound!.snapshotAfter[b?.name??'']
                      const isEdit = !!editDeltas[p.pairingId]
                      const isSit = p.aId===p.bId
                      const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--green)':p.type==='STAPLED'?'var(--gold)':'var(--dove)'
                      return (
                        <tr key={p.pairingId} style={{ borderBottom:'1px solid var(--border)', background:isEdit?'rgba(232,160,32,0.04)':'transparent' }}>
                          <td style={{ padding:'5px 7px', color:'var(--text-dim)' }}>{i+1}</td>
                          <td style={{ padding:'5px 7px' }}><span style={{ color:tc, fontWeight:700, fontSize:11 }}>{p.type}</span></td>
                          <td style={{ padding:'5px 7px', color:'var(--text)' }}>{a?.name.split(',')[0]??'?'}</td>
                          <td style={{ padding:'5px 7px' }}><span className={`tag tag-${p.aChoice}`} style={{ fontSize:10 }}>{p.aChoice[0].toUpperCase()}</span></td>
                          <td style={{ padding:'5px 7px', color:'var(--text-dim)' }}>{fmt(state.pendingRound!.snapshotBefore[a?.name??'']??0)}</td>
                          <td style={{ padding:'5px 7px' }}>
                            {isEdit
                              ? <input type="number" style={{ width:65, padding:'2px 5px', background:'var(--bg)', border:'1px solid var(--gold)', color:'var(--gold)', fontFamily:'inherit', fontSize:11 }}
                                  value={editDeltas[p.pairingId]?.a??p.aDelta}
                                  onChange={e=>setEditDeltas(prev=>({...prev,[p.pairingId]:{...prev[p.pairingId],a:e.target.value}}))} />
                              : <span style={{ color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight:500 }}>
                                  {p.aDelta>0?'+':''}{fmt(p.aDelta)} → <span style={{ color:'var(--gold)' }}>{fmt(aAfter??0)}</span>
                                </span>
                            }
                          </td>
                          <td style={{ padding:'5px 7px', color:'var(--text)' }}>{isSit?'(sits out)':b?.name.split(',')[0]??'?'}</td>
                          <td style={{ padding:'5px 7px' }}>{!isSit&&<span className={`tag tag-${p.bChoice}`} style={{ fontSize:10 }}>{p.bChoice[0].toUpperCase()}</span>}</td>
                          <td style={{ padding:'5px 7px', color:'var(--text-dim)' }}>{!isSit&&fmt(state.pendingRound!.snapshotBefore[b?.name??'']??0)}</td>
                          <td style={{ padding:'5px 7px' }}>
                            {!isSit&&(isEdit
                              ? <input type="number" style={{ width:65, padding:'2px 5px', background:'var(--bg)', border:'1px solid var(--gold)', color:'var(--gold)', fontFamily:'inherit', fontSize:11 }}
                                  value={editDeltas[p.pairingId]?.b??p.bDelta}
                                  onChange={e=>setEditDeltas(prev=>({...prev,[p.pairingId]:{...prev[p.pairingId],b:e.target.value}}))} />
                              : <span style={{ color:p.bDelta>0?'var(--green)':p.bDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight:500 }}>
                                  {p.bDelta>0?'+':''}{fmt(p.bDelta)} → <span style={{ color:'var(--gold)' }}>{fmt(bAfter??0)}</span>
                                </span>
                            )}
                          </td>
                          <td style={{ padding:'5px 7px', color:'var(--text-dim)', fontSize:10, maxWidth:180 }}>{p.note}</td>
                          <td style={{ padding:'5px 7px' }}>
                            {!isSit&&(isEdit
                              ? <div style={{ display:'flex', gap:3 }}>
                                  <button className="btn btn-gold" style={{ padding:'2px 7px', fontSize:10 }}
                                    onClick={() => { act('update_points',{pairingId:p.pairingId,aDelta:parseFloat(editDeltas[p.pairingId]?.a),bDelta:parseFloat(editDeltas[p.pairingId]?.b)}); setEditDeltas(prev=>{const n={...prev};delete n[p.pairingId];return n}) }}>Save</button>
                                  <button className="btn btn-ghost" style={{ padding:'2px 7px', fontSize:10 }} onClick={()=>setEditDeltas(prev=>{const n={...prev};delete n[p.pairingId];return n})}>✕</button>
                                </div>
                              : <button className="btn btn-ghost" style={{ padding:'2px 7px', fontSize:10 }}
                                  onClick={()=>setEditDeltas(prev=>({...prev,[p.pairingId]:{a:String(p.aDelta),b:String(p.bDelta)}}))}>Edit</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab==='history' && (
        <div>
          {state.rounds.length===0
            ? <div style={{ color:'var(--text-dim)', fontSize:13 }}>No finalized rounds yet.</div>
            : [...state.rounds].reverse().map(r => (
              <div key={r.round} className="card" style={{ padding:14, marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>Round {r.round} — Week {r.week}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)' }}>
                      {r.finalizedAt ? new Date(r.finalizedAt).toLocaleString() : '—'} ·
                      <span style={{ color:'var(--hawk)', marginLeft:6 }}>{r.pairings.filter(p=>p.type==='H+H').length} H+H</span>
                      <span style={{ color:'var(--dove)', marginLeft:6 }}>{r.pairings.filter(p=>p.type==='H+D').length} H+D</span>
                      <span style={{ color:'var(--green)', marginLeft:6 }}>{r.pairings.filter(p=>p.type==='D+D').length} D+D</span>
                      {r.pairings.some(p=>p.type==='STAPLED') && <span style={{ color:'var(--gold)', marginLeft:6 }}>{r.pairings.filter(p=>p.type==='STAPLED').length} Stapled</span>}
                    </div>
                  </div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Type','A Name','Play','Before','Δ','After','B Name','Play','Before','Δ','After','Note'].map(h => (
                          <th key={h} style={{ padding:'4px 6px', textAlign:'left', color:'var(--text-dim)', fontWeight:400, fontSize:10 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.pairings.map((p,i) => {
                        const a = state.students.find(s=>s.id===p.aId)
                        const b = state.students.find(s=>s.id===p.bId)
                        const tc = p.type==='H+H'?'var(--hawk)':p.type==='D+D'?'var(--green)':p.type==='STAPLED'?'var(--gold)':'var(--dove)'
                        const isSit = p.aId===p.bId
                        return (
                          <tr key={p.pairingId} style={{ borderBottom:'1px solid rgba(26,32,48,0.8)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding:'4px 6px' }}><span style={{ color:tc, fontWeight:700 }}>{p.type}</span></td>
                            <td style={{ padding:'4px 6px', color:'var(--text)' }}>{a?.name??'?'}</td>
                            <td style={{ padding:'4px 6px' }}><span className={`tag tag-${p.aChoice}`} style={{ fontSize:9 }}>{p.aChoice[0].toUpperCase()}</span></td>
                            <td style={{ padding:'4px 6px', color:'var(--text-dim)' }}>{fmt(r.snapshotBefore[a?.name??'']??0)}</td>
                            <td style={{ padding:'4px 6px', color:p.aDelta>0?'var(--green)':p.aDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight:500 }}>{p.aDelta>0?'+':''}{fmt(p.aDelta)}</td>
                            <td style={{ padding:'4px 6px', color:'var(--gold)' }}>{fmt(r.snapshotAfter[a?.name??'']??0)}</td>
                            <td style={{ padding:'4px 6px', color:'var(--text)' }}>{isSit?'(sits out)':b?.name??'?'}</td>
                            <td style={{ padding:'4px 6px' }}>{!isSit&&<span className={`tag tag-${p.bChoice}`} style={{ fontSize:9 }}>{p.bChoice[0].toUpperCase()}</span>}</td>
                            <td style={{ padding:'4px 6px', color:'var(--text-dim)' }}>{!isSit&&fmt(r.snapshotBefore[b?.name??'']??0)}</td>
                            <td style={{ padding:'4px 6px', color:p.bDelta>0?'var(--green)':p.bDelta<0?'var(--hawk)':'var(--text-dim)', fontWeight:500 }}>{!isSit&&<>{p.bDelta>0?'+':''}{fmt(p.bDelta)}</>}</td>
                            <td style={{ padding:'4px 6px', color:'var(--gold)' }}>{!isSit&&fmt(r.snapshotAfter[b?.name??'']??0)}</td>
                            <td style={{ padding:'4px 6px', color:'var(--text-dim)', fontSize:10, maxWidth:200 }}>{p.note}</td>
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


      {/* ── VOTING TAB ── */}
      {tab==='voting' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card" style={{ padding:16 }}>
            <div className="label" style={{ marginBottom:12 }}>Voting Settings</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div className="label" style={{ marginBottom:4, fontSize:9 }}>Game Title (replaces HAWK / DOVE in headers)</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="input" style={{ flex:1 }} placeholder="e.g. Support / Fight" value={gameTitleInput} onChange={e => setGameTitleInput(e.target.value)} />
                  <button className="btn btn-ghost" style={{ padding:'5px 12px', fontSize:11 }} onClick={() => act('set_game_title', { title: gameTitleInput })}>Set</button>
                  <button className="btn btn-ghost" style={{ padding:'5px 12px', fontSize:11 }} onClick={() => { setGameTitleInput(''); act('set_game_title', { title: '' }) }}>Clear</button>
                </div>
                <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>Format: "OptionA / OptionB" — leave blank to show HAWK / DOVE</div>
              </div>
              <div>
                <div className="label" style={{ marginBottom:4, fontSize:9 }}>Candidate / President</div>
                <select className="input" value={presidentId} onChange={e => setPresidentId(e.target.value)}>
                  <option value="">— No candidate selected —</option>
                  {state.students.map(s => <option key={s.id} value={s.id}>{s.name} ({fmt(s.points)} pts)</option>)}
                </select>
              </div>
              <div>
                <div className="label" style={{ marginBottom:4, fontSize:9 }}>Candidate Title (optional, shown under name)</div>
                <input className="input" placeholder="e.g. The Hawk, Incumbent, Challenger..." value={presidentTitle} onChange={e => setPresidentTitle(e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div className="label" style={{ marginBottom:4, fontSize:9 }}>Option A Label</div>
                  <input className="input" value={votingOptionA} onChange={e => setVotingOptionA(e.target.value)} />
                </div>
                <div>
                  <div className="label" style={{ marginBottom:4, fontSize:9 }}>Option B Label</div>
                  <input className="input" value={votingOptionB} onChange={e => setVotingOptionB(e.target.value)} />
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom:4, fontSize:9 }}>Voting Deadline (YYYY-MM-DD HH:MM)</div>
                <input className="input" placeholder="2026-05-01 23:59" value={votingDeadline} onChange={e => setVotingDeadline(e.target.value)} />
              </div>
              <button className="btn btn-gold" style={{ padding:8 }} onClick={() => act('update_voting', { optionA: votingOptionA, optionB: votingOptionB, deadline: votingDeadline, presidentId, presidentTitle })}>
                Save Voting Settings
              </button>
              <hr style={{ border:'none', borderTop:'1px solid var(--border)' }} />
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn" style={{ borderColor: state.votingTabOpen ? 'var(--hawk)' : 'var(--green)', color: state.votingTabOpen ? 'var(--hawk)' : 'var(--green)', padding:'7px 14px', fontSize:11 }}
                  onClick={() => act('toggle_voting_tab')}>
                  {state.votingTabOpen ? '✕ Hide Vote Tab' : '▶ Show Vote Tab'}
                </button>
                <button className="btn" style={{ borderColor: state.voting?.open ? 'var(--hawk)' : 'var(--dove)', color: state.voting?.open ? 'var(--hawk)' : 'var(--dove)', padding:'7px 14px', fontSize:11 }}
                  onClick={() => act('update_voting', { open: !state.voting?.open })}>
                  {state.voting?.open ? '✕ Close Voting' : '▶ Open Voting'}
                </button>
                <button className="btn btn-gold" style={{ padding:'7px 14px', fontSize:11 }} onClick={() => act('reveal_results')}>Reveal Results</button>
                <button className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:11 }} onClick={() => { if (confirm('Clear all votes?')) act('clear_votes') }}>Clear Votes</button>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding:16 }}>
            <div className="label" style={{ marginBottom:12 }}>Live Results (hidden from students until revealed)</div>
            {(() => {
              const optA = state.voting?.optionA || 'Support'
              const optB = state.voting?.optionB || 'Fight'
              const votesA = state.students.filter(s => s.voteChoice === 'a').length
              const votesB = state.students.filter(s => s.voteChoice === 'b').length
              const total = votesA + votesB
              return (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    <div style={{ background:'#1e1408', border:'1px solid #3a1800', padding:14, textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:500, color:'#e8a020' }}>{votesA}</div>
                      <div style={{ fontSize:11, color:'#e8a020', marginTop:3, letterSpacing:'0.1em' }}>{optA}</div>
                    </div>
                    <div style={{ background:'#0e0d20', border:'1px solid #1a1840', padding:14, textAlign:'center' }}>
                      <div style={{ fontSize:26, fontWeight:500, color:'#7F77DD' }}>{votesB}</div>
                      <div style={{ fontSize:11, color:'#7F77DD', marginTop:3, letterSpacing:'0.1em' }}>{optB}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-dim)' }}>{state.students.length} eligible · {total} voted · {state.students.length - total} remaining</div>
                  <div style={{ marginTop:10, height:6, background:'var(--border)', position:'relative' }}>
                    <div style={{ height:'100%', background:'#e8a020', width:`${total > 0 ? (votesA/total)*100 : 50}%`, transition:'width 0.5s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-dim)', marginTop:4 }}>
                    <span>{total > 0 ? Math.round(votesA/total*100) : 0}% {optA}</span>
                    <span>{total > 0 ? Math.round(votesB/total*100) : 0}% {optB}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── NEWSBOX TAB ── */}
      {tab==='newsbox' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div className="card" style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div className="label">Post to Newsbox</div>
              <button className="btn" style={{ borderColor: state.newsboxTabOpen ? 'var(--hawk)' : 'var(--green)', color: state.newsboxTabOpen ? 'var(--hawk)' : 'var(--green)', padding:'4px 10px', fontSize:10 }}
                onClick={() => act('toggle_newsbox_tab')}>
                {state.newsboxTabOpen ? '✕ Hide Newsbox Tab' : '▶ Show Newsbox Tab'}
              </button>
            </div>
            <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
              {[['B','bold'],['I','italic'],['U','underline']].map(([label, cmd]) => (
                <button key={cmd} className="btn btn-ghost" style={{ padding:'3px 9px', fontSize:12 }}
                  onClick={() => { document.execCommand(cmd, false); newsEditorRef?.focus() }}>
                  <span style={{ fontStyle: cmd==='italic'?'italic':'normal', textDecoration: cmd==='underline'?'underline':'none', fontWeight: cmd==='bold'?700:400 }}>{label}</span>
                </button>
              ))}
              <button className="btn btn-ghost" style={{ padding:'3px 9px', fontSize:12, background:'var(--gold-bg)', borderColor:'var(--gold)', color:'var(--gold)' }}
                onClick={() => {
                  const sel = window.getSelection()
                  if (!sel?.rangeCount || sel.isCollapsed) return
                  const range = sel.getRangeAt(0)
                  const span = document.createElement('span')
                  span.style.cssText = 'background:#3a2a00;color:#e8a020;padding:0 2px;'
                  try { range.surroundContents(span) } catch(e) {}
                  newsEditorRef?.focus()
                }}>H</button>
              <button className="btn btn-ghost" style={{ padding:'3px 9px', fontSize:10 }} onClick={() => { document.execCommand('removeFormat'); newsEditorRef?.focus() }}>Clear</button>
              <span style={{ fontSize:10, color:'var(--text-dim)', marginLeft:4 }}>Select text then format</span>
            </div>
            <div
              ref={el => setNewsEditorRef(el)}
              contentEditable
              suppressContentEditableWarning
              className="input"
              data-placeholder="Write a message to students..."
              style={{ minHeight:80, padding:'8px 10px', lineHeight:1.7, fontSize:12, outline:'none' }}
              onInput={e => setNewsEditor((e.target as HTMLDivElement).innerHTML)}
            />
            <div style={{ marginTop:8, padding:'8px 10px', background:'var(--bg-raised)', border:'1px solid var(--border)', minHeight:36 }}>
              <div className="label" style={{ marginBottom:3 }}>Preview</div>
              <div style={{ fontSize:12, lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: newsEditor || '<span style="color:var(--text-dim)">Nothing yet...</span>' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
              <button className="btn btn-dove" onClick={async () => {
                const html = newsEditorRef?.innerHTML?.trim()
                if (!html || html === '<br>') return
                await act('post_news', { html })
                if (newsEditorRef) newsEditorRef.innerHTML = ''
                setNewsEditor('')
              }}>Post →</button>
            </div>
          </div>
          <div className="card" style={{ padding:16 }}>
            <div className="label" style={{ marginBottom:12 }}>Posted Messages</div>
            {!state.newsItems || state.newsItems.length === 0
              ? <div style={{ fontSize:12, color:'var(--text-dim)' }}>No posts yet.</div>
              : state.newsItems.map(item => (
                <div key={item.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ fontSize:12, lineHeight:1.7, flex:1 }} dangerouslySetInnerHTML={{ __html: item.html }} />
                    <button className="btn btn-danger" style={{ padding:'2px 8px', fontSize:10, flexShrink:0 }} onClick={() => act('delete_news', { id: item.id })}>✕</button>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {tab==='insights' && <InsightsPanel students={state.students} rounds={state.rounds} />}
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
  const maxPts = sorted[0]?.points || 1
  const stapledCount = active.filter(s => s.staplePartnerId).length

  const dovePts = doves.map(s => s.points)
  const hawkPts = hawks.map(s => s.points)
  const doveAvg = dovePts.length ? Math.round(dovePts.reduce((a,b)=>a+b,0)/dovePts.length) : 0
  const hawkAvg = hawkPts.length ? Math.round(hawkPts.reduce((a,b)=>a+b,0)/hawkPts.length) : 0
  const doveUnder400 = dovePts.length ? Math.round(dovePts.filter(p=>p<400).length/dovePts.length*100) : 0
  const hawkOver500 = hawkPts.length ? Math.round(hawkPts.filter(p=>p>500).length/hawkPts.length*100) : 0
  const top20pct = sorted.slice(0, Math.ceil(active.length * 0.2))
  const top20pts = top20pct.reduce((s,x)=>s+x.points,0)
  const top20share = total > 0 ? Math.round(top20pts/total*100) : 0

  const quotes = [
    `${doveUnder400}% of doves hold fewer than 400 points.`,
    `Hawks average ${fmt(hawkAvg)} pts vs doves at ${fmt(doveAvg)} pts.`,
    `${hawkOver500}% of hawks hold over 500 points.`,
    `Top 20% of players control ${top20share}% of all points in play.`,
  ]

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {quotes.map((q,i) => (
        <div key={i} className="card" style={{ padding:18 }}>
          <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:6, letterSpacing:'0.15em' }}>INSIGHT {i+1}</div>
          <div style={{ fontSize:15, color:'var(--gold)', lineHeight:1.5 }}>"{q}"</div>
        </div>
      ))}
      <div className="card" style={{ padding:14, gridColumn:'1/-1' }}>
        <div className="label" style={{ marginBottom:10 }}>Choice split (current round)</div>
        <div style={{ display:'flex', gap:5, alignItems:'center', height:28 }}>
          {[
            { count: hawks.length, color:'var(--hawk)', bg:'var(--hawk-bg)', label:`🦅 ${hawks.length} Hawks` },
            { count: doves.length, color:'var(--dove)', bg:'var(--dove-bg)', label:`🕊️ ${doves.length} Doves` },
            { count: active.filter(s=>!s.choice).length, color:'var(--text-dim)', bg:'var(--bg-raised)', label:`— ${active.filter(s=>!s.choice).length} no choice` },
          ].map(({count,color,bg,label}) => count > 0 && (
            <div key={label} style={{ flex:count, height:'100%', background:bg, border:`1px solid ${color}`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color, minWidth:40, transition:'flex 0.5s' }}>
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding:14, gridColumn:'1/-1' }}>
        <div className="label" style={{ marginBottom:10 }}>Points — all players</div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {sorted.map((s,i) => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:160, fontSize:11, color:'var(--text-mid)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {s.name.split(',')[0]}{s.staplePartnerId ? ' 📌' : ''}
              </div>
              <div style={{ flex:1, height:13, background:'var(--bg-raised)', position:'relative' }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', transition:'width 0.5s',
                  width:`${(s.points/maxPts)*100}%`,
                  background: s.choice==='hawk'?'var(--hawk-bg)':s.choice==='dove'?'var(--dove-bg)':'var(--bg-raised)',
                  borderRight:`2px solid ${s.choice==='hawk'?'var(--hawk)':s.choice==='dove'?'var(--dove)':'var(--border-hi)'}` }} />
              </div>
              <div style={{ width:55, textAlign:'right', fontSize:11, color:'var(--gold)', fontWeight:500 }}>{fmt(s.points)}</div>
              <div style={{ width:16, textAlign:'center', fontSize:10, color:'var(--text-dim)' }}>{s.tiebreaker}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding:14 }}>
        <div className="label" style={{ marginBottom:10 }}>Key stats</div>
        {[
          ['Active players', active.length],
          ['Total pts in play', fmt(total)],
          ['Average pts', fmt(avg)],
          ['Protectorates', `${stapledCount} players (${stapledCount/2|0} pairs)`],
          ['Richest', `${sorted[0]?.name.split(',')[0]??'—'} (${fmt(sorted[0]?.points??0)})`],
          ['Least pts', `${sorted[sorted.length-1]?.name.split(',')[0]??'—'} (${fmt(sorted[sorted.length-1]?.points??0)})`],
          ['Rounds played', rounds.length],
        ].map(([l,v]) => (
          <div key={String(l)} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'var(--text-dim)' }}>{l}</span>
            <span style={{ color:'var(--text)', fontWeight:500 }}>{v}</span>
          </div>
        ))}
      </div>
      {rounds.length > 0 && (
        <div className="card" style={{ padding:14 }}>
          <div className="label" style={{ marginBottom:10 }}>Round breakdown</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Rnd','H+H','H+D','D+D','📌'].map(h => (
                  <th key={h} style={{ padding:'4px 6px', textAlign:'center', color:'var(--text-dim)', fontWeight:400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map(r => (
                <tr key={r.round} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'4px 6px', textAlign:'center', color:'var(--text-mid)' }}>{r.round}</td>
                  <td style={{ padding:'4px 6px', textAlign:'center', color:'var(--hawk)' }}>{r.pairings.filter(p=>p.type==='H+H').length}</td>
                  <td style={{ padding:'4px 6px', textAlign:'center', color:'var(--dove)' }}>{r.pairings.filter(p=>p.type==='H+D').length}</td>
                  <td style={{ padding:'4px 6px', textAlign:'center', color:'var(--green)' }}>{r.pairings.filter(p=>p.type==='D+D').length}</td>
                  <td style={{ padding:'4px 6px', textAlign:'center', color:'var(--gold)' }}>{r.pairings.filter(p=>p.type==='STAPLED').length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
