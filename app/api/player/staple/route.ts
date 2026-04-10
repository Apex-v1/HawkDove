// app/api/player/staple/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { offerStaple, getGameState } from '@/lib/store'

export async function POST(req: NextRequest) {
  const state = getGameState()
  if (state.week !== 2) {
    return NextResponse.json({ error: 'Only available in week 2' }, { status: 403 })
  }

  const { playerId, accept } = await req.json()
  if (!playerId || accept === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  offerStaple(playerId, accept)
  return NextResponse.json({ ok: true })
}
