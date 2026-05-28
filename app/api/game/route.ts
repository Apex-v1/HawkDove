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
    gazetteTabOpen: s.gazetteTabOpen,
    archiveTabOpen: s.archiveTabOpen,
    newsItems: s.newsItems || [],
    archiveArticles: s.archiveArticles || [],
    voting: {
      open: s.voting.open,
      optionA: s.voting.optionA,
      optionB: s.voting.optionB,
      deadline: s.voting.deadline,
      resultsRevealed: s.voting.resultsRevealed,
      presidentId: s.voting.presidentId,
      presidentTitle: s.voting.presidentTitle,
      liveVotesVisible: s.voting.liveVotesVisible ?? false,
      coupThreshold: s.voting.coupThreshold ?? 10,
      coupTriggered: s.voting.coupTriggered ?? false,
      // only expose individual votes if liveVotesVisible is on
      liveVotes: s.voting.liveVotesVisible
        ? s.students.filter(st => st.voteChoice).map(st => ({ name: st.name, choice: st.voteChoice }))
        : [],
      votesA: s.students.filter(st => st.voteChoice === 'a').length,
      votesB: s.students.filter(st => st.voteChoice === 'b').length,
      totalVoted: s.voting.votedEmails.length,
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
