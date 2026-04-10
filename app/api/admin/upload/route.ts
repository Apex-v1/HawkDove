import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin, loadRoster } from '@/lib/store'
export const dynamic = 'force-dynamic'

async function auth(req: NextRequest) {
  return await checkAdmin(req.cookies.get('hd_admin')?.value || '')
}

export async function POST(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { read, utils } = await import('xlsx')
    const wb = read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json<Record<string, unknown>>(ws)

    if (rows.length === 0) return NextResponse.json({ error: 'Empty spreadsheet' }, { status: 400 })

    // Flexible column matching
    const students = rows.map(row => {
      const keys = Object.keys(row)
      const get = (patterns: string[]) => {
        const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())))
        return key ? row[key] : undefined
      }
      const name = String(get(['name']) ?? '')
      const email = String(get(['email']) ?? '')
      const tiebreaker = parseFloat(String(get(['tiebreaker','tie']) ?? '0')) || 0
      const points = parseFloat(String(get(['point','pts','balance']) ?? '0')) || 0
      const roundType = String(get(['type','round 2 type','r2 type']) ?? '')
      const roundResult = String(get(['result','round 2 result']) ?? '')
      const roundPair = String(get(['pair','round 2 pair']) ?? '')
      return { name, email, tiebreaker, points, roundType, roundResult, roundPair }
    }).filter(s => s.name && s.name !== 'undefined')

    await loadRoster(students)
    return NextResponse.json({ ok: true, count: students.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
