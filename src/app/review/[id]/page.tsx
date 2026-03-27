import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VideoReview from '@/components/VideoReview'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const review = await prisma.review.findUnique({
    where: { id },
    include: { comments: { orderBy: { timestamp: 'asc' } } },
  })

  if (!review) notFound()

  return <VideoReview review={review} />
}
