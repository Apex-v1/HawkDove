import { NextRequest, NextResponse } from 'next/server'
import { getState, submitVote } from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getState()
  return NextResponse.json({
    open: s.voting.open,
    optionA: s.voting.optionA,
    optionB: s.voting.optionB,
    deadline: s.voting.deadline,
    resultsRevealed: s.voting.resultsRevealed,
    gameTitle: s.gameTitle || '',
  })
}

export async function POST(req: NextRequest) {
  const { email, choice } = await req.json()
  if (!email || !choice) return NextResponse.json({ error: 'Email and choice required.' }, { status: 400 })
  const result = await submitVote(email, choice)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
