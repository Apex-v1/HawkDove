// app/api/game/route.ts
import { NextResponse } from 'next/server'
import { getGameState } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = getGameState()
  // Return a sanitized public view (no other players' choices until reveal)
  return NextResponse.json({
    week: state.week,
    roundNumber: state.roundNumber,
    phase: state.phase,
    sessionStarted: state.sessionStarted,
    playerCount: state.players.filter(p => !p.isEliminated).length,
    submittedCount: state.players.filter(p => p.hasSubmitted && !p.isEliminated).length,
    adminMessage: state.adminMessage,
    // In reveal phase, send full pairing results
    currentPairings: state.phase === 'reveal' || state.phase === 'resolved'
      ? state.currentPairings
      : [],
    players: state.phase === 'reveal' || state.phase === 'resolved'
      ? state.players.map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          isEliminated: p.isEliminated,
          cardNumber: p.cardNumber,
          staplePairId: p.staplePairId,
        }))
      : state.players.map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          isEliminated: p.isEliminated,
          hasSubmitted: p.hasSubmitted,
          staplePairId: p.staplePairId,
        })),
  })
}
