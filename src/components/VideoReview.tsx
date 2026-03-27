'use client'

import { useEffect, useRef, useState } from 'react'

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
  const durationRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const wasPlayingRef = useRef(false)
  const [comments, setComments] = useState<ReviewComment[]>(review.comments)
  const [addingAt, setAddingAt] = useState<number | null>(null)
  const [newComment, setNewComment] = useState({ author: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  // Attach video events via native DOM listeners — more reliable with dynamic imports
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onMeta = () => {
      const d = video.duration
      if (d && isFinite(d)) { setDuration(d); durationRef.current = d }
    }
    const onTime = () => setCurrentTime(video.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('durationchange', onMeta)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    // Pick up duration if metadata already loaded
    if (video.duration && isFinite(video.duration)) onMeta()
    return () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('durationchange', onMeta)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  // Always-current scrub function stored in a ref so window listeners never go stale
  const scrubRef = useRef<(clientX: number) => void>(() => {})
  scrubRef.current = (clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect()
    const d = durationRef.current
    if (!rect || !d) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    if (videoRef.current) videoRef.current.currentTime = ratio * d
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }

  function seekTo(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    wasPlayingRef.current = !videoRef.current?.paused
    videoRef.current?.pause()
    setIsDragging(true)
    scrubRef.current(e.clientX)

    function onMouseMove(e: MouseEvent) { scrubRef.current(e.clientX) }
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
        <div className="bg-white border border-gray-200 rounded-2xl mb-8" style={{ padding: 8 }}>
          <div className="bg-black overflow-hidden" style={{ borderRadius: 6 }}>
            <video
              ref={videoRef}
              src={`/api/slack/proxy/${review.slackFileId}`}
              className="w-full aspect-video object-contain cursor-pointer"
              onClick={togglePlay}
            />
          </div>

          <div className="px-3 pt-4 pb-3">
            {/* Progress bar */}
            <div
              ref={progressRef}
              onMouseDown={handleMouseDown}
              className="relative mb-4 select-none cursor-pointer"
              style={{ height: 20 }}
            >
              {/* Track */}
              <div
                className="absolute left-0 right-0 rounded-full"
                style={{ top: 6, height: 8, backgroundColor: '#D4DEE9' }}
              />
              {/* Fill */}
              <div
                className="absolute left-0 rounded-full pointer-events-none"
                style={{
                  top: 6,
                  height: 8,
                  width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                  backgroundColor: '#95A4BA',
                }}
              />
              {/* Comment dots */}
              {comments.map((comment) => (
                <button
                  key={comment.id}
                  onClick={(e) => { e.stopPropagation(); seekTo(comment.timestamp) }}
                  style={{
                    position: 'absolute',
                    left: duration ? `${(comment.timestamp / duration) * 100}%` : '0%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 10,
                    height: 10,
                    backgroundColor: '#CC4B00',
                    border: '2px solid white',
                    borderRadius: '50%',
                    opacity: 0.7,
                    zIndex: 10,
                  }}
                  title={`${formatTime(comment.timestamp)} — ${comment.author}: ${comment.text}`}
                />
              ))}
              {/* Thumb */}
              <div
                style={{
                  position: 'absolute',
                  left: duration ? `${(currentTime / duration) * 100}%` : '0%',
                  top: '50%',
                  transform: `translate(-50%, -50%) scale(${isDragging ? 1.25 : 1})`,
                  width: 14,
                  height: 14,
                  backgroundColor: '#533AFD',
                  border: '2px solid white',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  transition: 'transform 0.1s',
                  zIndex: 20,
                }}
              />
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
                <span className="text-[#8B95B0] text-sm tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {addingAt === null && (
                <button
                  onClick={() => { videoRef.current?.pause(); setAddingAt(currentTime) }}
                  className="bg-[#5B4EE8] hover:bg-[#4D42D4] text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
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
                Commenting at <span className="text-[#5B4EE8] font-medium">{formatTime(addingAt)}</span>
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
                    className="flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors px-2 flex-shrink-0"
                    style={{ border: '1px solid #D4DEE9', borderRadius: 6, height: 24, color: '#1A2C44' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 11 11" fill="currentColor">
                      <polygon points="1,0.5 10.5,5.5 1,10.5" />
                    </svg>
                    <span className="text-xs font-semibold" style={{ fontFamily: 'inherit' }}>{formatTime(comment.timestamp)}</span>
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
