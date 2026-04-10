import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return NextResponse.json({ error: 'Missing env vars', url: !!url, token: !!token })
  }

  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url, token })
    await redis.set('hd_debug_ping', 'ok')
    const val = await redis.get('hd_debug_ping')
    return NextResponse.json({ success: true, ping: val, urlPrefix: url.slice(0, 30) })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e), urlPrefix: url.slice(0, 30) })
  }
}
