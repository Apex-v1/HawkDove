// app/api/admin/control/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import {
  getGameState,
  setWeek,
  startRound,
  resolveRound,
  setAdminMessage,
  setPhase,
  resetGame,
  Week,
} from '@/lib/store'

function isAuthed(req: NextRequest): boolean {
  const cookie = req.cookies.get('admin_auth')?.value
  return checkAdmin(cookie || '')
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, payload } = await req.json()

  try {
    switch (action) {
      case 'open_session': {
        const state = getGameState()
        state.sessionStarted = true
        return NextResponse.json({ ok: true, state: getGameState() })
      }

      case 'close_session': {
        const state = getGameState()
        state.sessionStarted = false
        return NextResponse.json({ ok: true })
      }

      case 'set_week': {
        const state = setWeek(payload.week as Week)
        return NextResponse.json({ ok: true, state })
      }

      case 'start_round': {
        const round = startRound()
        return NextResponse.json({ ok: true, round, state: getGameState() })
      }

      case 'resolve_round': {
        const round = resolveRound()
        return NextResponse.json({ ok: true, round, state: getGameState() })
      }

      case 'set_message': {
        setAdminMessage(payload.message)
        return NextResponse.json({ ok: true })
      }

      case 'set_phase': {
        setPhase(payload.phase)
        return NextResponse.json({ ok: true })
      }

      case 'reset': {
        const state = resetGame()
        return NextResponse.json({ ok: true, state })
      }

      case 'get_state': {
        return NextResponse.json({ ok: true, state: getGameState() })
      }

      case 'hawk_transfer': {
        // Admin records a manual transfer from hawk to dove in stapled pair
        const { hawkId, amount } = payload
        const state = getGameState()
        const hawk = state.players.find(p => p.id === hawkId)
        const dove = hawk?.staplePairId ? state.players.find(p => p.id === hawk.staplePairId) : null
        if (!hawk || !dove) return NextResponse.json({ error: 'Players not found' }, { status: 404 })
        const xfer = Math.min(amount, hawk.points)
        hawk.points -= xfer
        dove.points += xfer
        return NextResponse.json({ ok: true, state: getGameState() })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ state: getGameState() })
}
