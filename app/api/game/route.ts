import { NextResponse } from 'next/server'
import { getState } from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getState()
  return NextResponse.json({
    roundOpen: s.roundOpen,
    currentRound: s.currentRound,
    week: s.week,
    displayRound: s.displayRound,
    gameTitle: s.gameTitle || '',
    votingTabOpen: s.votingTabOpen,
    newsboxTabOpen: s.newsboxTabOpen,
    newsItems: s.newsItems || [],
    voting: {
      open: s.voting.open,
      optionA: s.voting.optionA,
      optionB: s.voting.optionB,
      deadline: s.voting.deadline,
      resultsRevealed: s.voting.resultsRevealed,
    },
    students: s.students.map(st => ({
      id: st.id, name: st.name, email: st.email,
      points: st.points, tiebreaker: st.tiebreaker,
      hasChosen: st.hasChosen,
      choice: st.hasChosen ? st.choice : undefined,
      isEliminated: st.isEliminated,
      staplePartnerId: st.staplePartnerId,
      isHawkInStaple: st.isHawkInStaple,
    })),
    lastRound: s.rounds.length > 0 ? s.rounds[s.rounds.length - 1] : null,
    rounds: s.rounds,
  })
}
