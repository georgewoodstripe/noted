import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VideoReview from '@/components/VideoReviewClient'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const review = await prisma.review.findUnique({
    where: { id },
    include: { comments: { orderBy: { timestamp: 'asc' } } },
  })

  if (!review) notFound()

  const serialized = {
    ...review,
    createdAt: review.createdAt.toISOString(),
    comments: review.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  }

  return <VideoReview review={serialized} />
}
