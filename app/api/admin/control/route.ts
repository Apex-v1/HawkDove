import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin, getState, loadRoster, setStaple, removeStaple, setStapleTransfer, updateStudent, openRound, closeRound, computeRound, finalizeRound, resetState } from '@/lib/store'
export const dynamic = 'force-dynamic'

async function auth(req: NextRequest) {
  return await checkAdmin(req.cookies.get('hd_admin')?.value || '')
}

export async function GET(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ state: await getState() })
}

export async function POST(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { action, payload } = await req.json()
  try {
    switch (action) {
      case 'load_roster': { await loadRoster(payload.students); return NextResponse.json({ ok:true, state: await getState() }) }
      case 'set_staple': { await setStaple(payload.aId, payload.bId, payload.hawkId); return NextResponse.json({ ok:true, state: await getState() }) }
      case 'remove_staple': { await removeStaple(payload.id); return NextResponse.json({ ok:true, state: await getState() }) }
      case 'set_staple_transfer': { await setStapleTransfer(payload.hawkId, payload.amount); return NextResponse.json({ ok:true }) }
      case 'update_student': {
        await updateStudent(payload.id, { name: payload.name, email: payload.email, points: payload.points, tiebreaker: payload.tiebreaker })
        return NextResponse.json({ ok:true, state: await getState() })
      }
      case 'set_week': {
        const s = await getState(); s.week = payload.week
        try { const { Redis } = await import('@upstash/redis'); const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! }); await r.set('hd_game_state_v3', s) } catch {}
        return NextResponse.json({ ok:true })
      }
      case 'open_round': { await openRound(); return NextResponse.json({ ok:true, state: await getState() }) }
      case 'close_round': { await closeRound(); return NextResponse.json({ ok:true }) }
      case 'compute_round': { const record = await computeRound(); return NextResponse.json({ ok:true, record, state: await getState() }) }
      case 'finalize_round': { const record = await finalizeRound(); return NextResponse.json({ ok:true, record, state: await getState() }) }
      case 'update_points': {
        const s = await getState()
        if (s.pendingRound) {
          const p = s.pendingRound.pairings.find(x => x.pairingId === payload.pairingId)
          if (p) {
            p.aDelta = payload.aDelta; p.bDelta = payload.bDelta
            p.note = (p.note||'') + ' [adjusted]'
            const fresh = { ...s.pendingRound.snapshotBefore }
            s.pendingRound.pairings.forEach(pair => {
              if (pair.aId === pair.bId) return
              const a = s.students.find(x => x.id === pair.aId)!
              const b = s.students.find(x => x.id === pair.bId)!
              fresh[a.name] = Math.round(((s.pendingRound!.snapshotBefore[a.name]||0) + pair.aDelta)*100)/100
              fresh[b.name] = Math.round(((s.pendingRound!.snapshotBefore[b.name]||0) + pair.bDelta)*100)/100
            })
            s.pendingRound.snapshotAfter = fresh
            try { const { Redis } = await import('@upstash/redis'); const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! }); await r.set('hd_game_state_v3', s) } catch {}
          }
        }
        return NextResponse.json({ ok:true, state: await getState() })
      }
      case 'reset': { await resetState(); return NextResponse.json({ ok:true }) }
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
