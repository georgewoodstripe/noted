import { NextRequest, NextResponse } from 'next/server'
import { getSlackFileInfo } from '@/lib/slack'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 500 })
    }

    const { fileId } = await params
    const { url, mimetype } = await getSlackFileInfo(fileId)

    const range = request.headers.get('range')
    const fetchHeaders: HeadersInit = { Authorization: `Bearer ${token}` }
    if (range) fetchHeaders['Range'] = range

    const slackRes = await fetch(url, { headers: fetchHeaders })

    const responseHeaders: HeadersInit = {
      'Content-Type': mimetype || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }

    const contentLength = slackRes.headers.get('content-length')
    if (contentLength) responseHeaders['Content-Length'] = contentLength

    const contentRange = slackRes.headers.get('content-range')
    if (contentRange) responseHeaders['Content-Range'] = contentRange

    return new NextResponse(slackRes.body, {
      status: slackRes.status,
      headers: responseHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
