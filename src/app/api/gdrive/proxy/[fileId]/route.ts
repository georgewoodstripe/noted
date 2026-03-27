import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`

    const range = request.headers.get('range')
    const fetchHeaders: HeadersInit = {}
    if (range) fetchHeaders['Range'] = range

    const res = await fetch(url, { headers: fetchHeaders, redirect: 'follow' })

    const responseHeaders: HeadersInit = {
      'Content-Type': res.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    }

    const contentLength = res.headers.get('content-length')
    if (contentLength) responseHeaders['Content-Length'] = contentLength

    const contentRange = res.headers.get('content-range')
    if (contentRange) responseHeaders['Content-Range'] = contentRange

    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
