import { NextRequest, NextResponse } from 'next/server'
import { submitChoice } from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { studentId, choice } = await req.json()
  if (!studentId || !['hawk','dove'].includes(choice))
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const ok = await submitChoice(studentId, choice)
  if (!ok) return NextResponse.json({ error: 'Cannot submit right now' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
