// app/api/player/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { submitChoice, getGameState } from '@/lib/store'

export async function POST(req: NextRequest) {
  const state = getGameState()
  if (state.phase !== 'submit') {
    return NextResponse.json({ error: 'Not in submission phase' }, { status: 403 })
  }

  const { playerId, choice } = await req.json()
  if (!playerId || !choice || !['hawk', 'dove'].includes(choice)) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
  }

  const success = submitChoice(playerId, choice)
  if (!success) {
    return NextResponse.json({ error: 'Player not found or already submitted' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
