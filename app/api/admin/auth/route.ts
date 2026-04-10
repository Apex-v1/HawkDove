// app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (checkAdmin(password)) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('admin_auth', password, {
      httpOnly: true,
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: 'strict',
    })
    return res
  }
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
