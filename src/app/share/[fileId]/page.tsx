import VideoReview from '@/components/VideoReviewClient'

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ fileId: string }>
  searchParams: Promise<{ title?: string }>
}) {
  const { fileId } = await params
  const { title } = await searchParams

  const review = {
    id: '',
    title: title || 'Video Review',
    slackFileId: fileId,
    slackUrl: '',
    uploaderName: '',
    mimetype: 'video/mp4',
    source: 'gdrive',
    createdAt: new Date().toISOString(),
    comments: [],
  }

  return <VideoReview review={review} hideComments />
}
