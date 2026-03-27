import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { author, text, timestamp } = await request.json()

    if (!author || !text || timestamp === undefined) {
      return NextResponse.json(
        { error: 'author, text, and timestamp are required' },
        { status: 400 }
      )
    }

    const comment = await prisma.comment.create({
      data: { reviewId: id, author, text, timestamp },
    })

    return NextResponse.json(comment)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create comment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
