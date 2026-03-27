'use client'

import { useRef, useState } from 'react'

interface ReviewComment {
  id: string
  reviewId: string
  author: string
  text: string
  timestamp: number
  createdAt: string | Date
}

interface ReviewWithComments {
  id: string
  title: string
  slackFileId: string
  slackUrl: string
  uploaderName: string
  mimetype: string
  createdAt: string | Date
  comments: ReviewComment[]
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="3,1 13,7 3,13" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="1" width="4" height="12" rx="1" />
      <rect x="8" y="1" width="4" height="12" rx="1" />
    </svg>
  )
}

export default function VideoReview({ review }: { review: ReviewWithComments }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const wasPlayingRef = useRef(false)
  const [comments, setComments] = useState<ReviewComment[]>(review.comments)
  const [addingAt, setAddingAt] = useState<number | null>(null)
  const [newComment, setNewComment] = useState({ author: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }

  function seekTo(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds
  }

  function scrubFromEvent(clientX: number) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seekTo(ratio * duration)
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    wasPlayingRef.current = !videoRef.current?.paused
    videoRef.current?.pause()
    setIsDragging(true)
    scrubFromEvent(e.clientX)

    function onMouseMove(e: MouseEvent) { scrubFromEvent(e.clientX) }
    function onMouseUp() {
      setIsDragging(false)
      if (wasPlayingRef.current) videoRef.current?.play()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (addingAt === null) return
    setSubmitting(true)

    const res = await fetch(`/api/reviews/${review.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newComment, timestamp: addingAt }),
    })
    const comment = await res.json()

    setComments((prev) => [...prev, comment].sort((a, b) => a.timestamp - b.timestamp))
    setAddingAt(null)
    setNewComment({ author: '', text: '' })
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-[#2D3561] mb-6 text-center">{review.title}</h1>

        {/* Video card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-8">
          <div className="bg-black">
            <video
              ref={videoRef}
              src={`/api/slack/proxy/${review.slackFileId}`}
              className="w-full aspect-video object-contain cursor-pointer"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
          </div>

          <div className="px-5 pt-4 pb-5">
            {/* Progress bar */}
            <div
              ref={progressRef}
              onMouseDown={handleMouseDown}
              className={`relative h-2 bg-gray-200 rounded-full select-none mb-4${isDragging ? ' cursor-grabbing' : ' cursor-pointer'}`}
            >
              <div
                className="absolute left-0 top-0 h-full bg-[#5B4EE8] rounded-full pointer-events-none"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              {comments.map((comment) => (
                <button
                  key={comment.id}
                  onClick={(e) => { e.stopPropagation(); seekTo(comment.timestamp) }}
                  style={{ left: duration ? `${(comment.timestamp / duration) * 100}%` : '0%' }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-full hover:scale-125 transition-transform z-10"
                  title={`${formatTime(comment.timestamp)} — ${comment.author}: ${comment.text}`}
                />
              ))}
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  style={{ width: 26, height: 26 }}
                  className="rounded-full border-2 border-[#5B4EE8] text-[#5B4EE8] hover:bg-[#5B4EE8] hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <span className="text-[#8B95B0] text-sm font-mono tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {addingAt === null && (
                <button
                  onClick={() => { videoRef.current?.pause(); setAddingAt(currentTime) }}
                  className="bg-[#5B4EE8] hover:bg-[#4D42D4] text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
                >
                  Leave feedback at {formatTime(currentTime)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Comment form */}
        {addingAt !== null && (
          <form onSubmit={submitComment} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8B95B0]">
                Commenting at <span className="text-[#5B4EE8] font-mono font-medium">{formatTime(addingAt)}</span>
              </span>
              <button type="button" onClick={() => setAddingAt(null)} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                cancel
              </button>
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={newComment.author}
              onChange={(e) => setNewComment((prev) => ({ ...prev, author: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors"
              required
            />
            <textarea
              placeholder="Your feedback..."
              value={newComment.text}
              onChange={(e) => setNewComment((prev) => ({ ...prev, text: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors resize-none"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#5B4EE8] hover:bg-[#4D42D4] text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Posting...' : 'Post feedback'}
            </button>
          </form>
        )}

        {/* Comment count */}
        <p className="text-sm font-bold text-[#8B95B0] text-center mb-5">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </p>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center">
            <p className="text-sm text-[#8B95B0]">No feedback yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <button
                    onClick={() => seekTo(comment.timestamp)}
                    className="flex items-center gap-1.5 bg-[#5B4EE8]/10 hover:bg-[#5B4EE8]/20 text-[#5B4EE8] rounded-md px-2 py-0.5 transition-colors"
                  >
                    <svg width="9" height="9" viewBox="0 0 11 11" fill="currentColor">
                      <polygon points="1,0.5 10.5,5.5 1,10.5" />
                    </svg>
                    <span className="text-xs font-mono font-medium">{formatTime(comment.timestamp)}</span>
                  </button>
                  <span className="text-[#2D3561] text-sm font-semibold">{comment.author}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{comment.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
