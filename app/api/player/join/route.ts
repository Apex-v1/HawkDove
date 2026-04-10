// app/api/player/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { addPlayer, getGameState } from '@/lib/store'

export async function POST(req: NextRequest) {
  const state = getGameState()
  if (!state.sessionStarted) {
    return NextResponse.json({ error: 'Session not open yet' }, { status: 403 })
  }
  if (state.phase !== 'lobby') {
    return NextResponse.json({ error: 'Game already in progress' }, { status: 403 })
  }

  const { name, email, cardNumber } = await req.json()
  if (!name || !email || cardNumber === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const n = Number(cardNumber)
  if (isNaN(n) || n < 0 || n > 3) {
    return NextResponse.json({ error: 'Card number must be 0–3' }, { status: 400 })
  }

  // Check duplicate email
  const existing = state.players.find(p => p.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    // Return the existing player so they can reconnect
    return NextResponse.json({ player: existing, reconnected: true })
  }

  const player = addPlayer(name.trim(), email.trim().toLowerCase(), n)
  return NextResponse.json({ player, reconnected: false })
}
