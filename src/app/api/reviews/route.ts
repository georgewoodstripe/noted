import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveSlackMessageUrl } from '@/lib/slack'

export async function POST(request: NextRequest) {
  try {
    const { slackUrl } = await request.json()
    if (!slackUrl) {
      return NextResponse.json({ error: 'slackUrl is required' }, { status: 400 })
    }

    const fileInfo = await resolveSlackMessageUrl(slackUrl)

    const review = await prisma.review.create({
      data: {
        title: fileInfo.title,
        slackFileId: fileInfo.fileId,
        slackUrl,
        uploaderName: fileInfo.uploaderName,
        mimetype: fileInfo.mimetype,
      },
    })

    return NextResponse.json(review)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create review'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
