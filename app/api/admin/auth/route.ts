import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!await checkAdmin(password))
    return NextResponse.json({ error: 'Bad password' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('hd_admin', password, { httpOnly: true, maxAge: 60 * 60 * 12, sameSite: 'strict' })
  return res
}
