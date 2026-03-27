import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getSlackFileInfo } from '@/lib/slack'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    // Local test file support
    if (fileId.startsWith('local_')) {
      const fileName = fileId.replace('local_', '')
      const filePath = path.join(process.cwd(), 'public', fileName)
      const stat = fs.statSync(filePath)
      const fileSize = stat.size
      const range = request.headers.get('range')

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
        const start = parseInt(startStr, 10)
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1
        const chunkSize = end - start + 1
        const stream = fs.createReadStream(filePath, { start, end })
        return new NextResponse(stream as never, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': 'video/mp4',
          },
        })
      }

      const stream = fs.createReadStream(filePath)
      return new NextResponse(stream as never, {
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
        },
      })
    }

    const token = process.env.SLACK_BOT_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'SLACK_BOT_TOKEN not configured' }, { status: 500 })
    }

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
