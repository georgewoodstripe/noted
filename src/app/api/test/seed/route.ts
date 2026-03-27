import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const review = await prisma.review.create({
    data: {
      title: 'Test recording — Screen Recording 2026-03-20',
      slackFileId: 'local_test.mp4',
      slackUrl: 'local',
      uploaderName: 'George',
      mimetype: 'video/mp4',
    },
  })
  return NextResponse.json(review)
}
