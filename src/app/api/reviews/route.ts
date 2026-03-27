import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSlackMessageUrl } from '@/lib/slack'

function extractGDriveFileId(url: string): string | null {
  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return fileMatch[1]
  // https://drive.google.com/open?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch) return idMatch[1]
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { slackUrl, videoUrl, title } = await request.json()

    if (videoUrl) {
      const fileId = extractGDriveFileId(videoUrl)
      if (!fileId) {
        return NextResponse.json({ error: 'Invalid Google Drive URL' }, { status: 400 })
      }
      const review = await prisma.review.create({
        data: {
          title: title || 'Google Drive Video',
          slackFileId: fileId,
          slackUrl: videoUrl,
          uploaderName: 'Unknown',
          mimetype: 'video/mp4',
          source: 'gdrive',
        },
      })
      return NextResponse.json(review)
    }

    if (!slackUrl) {
      return NextResponse.json({ error: 'A URL is required' }, { status: 400 })
    }

    const fileInfo = await resolveSlackMessageUrl(slackUrl)

    const review = await prisma.review.create({
      data: {
        title: title || fileInfo.title,
        slackFileId: fileInfo.fileId,
        slackUrl,
        uploaderName: fileInfo.uploaderName,
        mimetype: fileInfo.mimetype,
        source: 'slack',
      },
    })

    return NextResponse.json(review)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create review'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
