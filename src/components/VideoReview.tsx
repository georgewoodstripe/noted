'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import NotedLogo from './NotedLogo'

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
  source: string
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
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [showResolved, setShowResolved] = useState(true)
  const [addingAt, setAddingAt] = useState<number | null>(null)
  const [newComment, setNewComment] = useState({ author: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  function toggleResolved(id: string) {
    setResolvedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function deleteComment(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
    fetch(`/api/reviews/${review.id}/comments/${id}`, { method: 'DELETE' }).catch(() => {})
  }

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

  async function submitComment(e: React.SyntheticEvent<HTMLFormElement>) {
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
      <div className="fixed top-5 left-6" style={{ zIndex: 50 }}>
        <Link href="/"><NotedLogo width={64} /></Link>
      </div>
      <div className="mx-auto px-6 py-10" style={{ maxWidth: '80vw' }}>
        <h1 className="text-2xl font-bold text-[#2D3561] mb-6 text-center">{review.title}</h1>

        {/* Video card */}
        <div className="bg-white border border-gray-200 rounded-2xl mb-8" style={{ padding: 8 }}>
          <div className="bg-black overflow-hidden" style={{ borderRadius: 6 }}>
            <video
              ref={videoRef}
              src={review.source === 'gdrive' ? `/api/gdrive/proxy/${review.slackFileId}` : `/api/slack/proxy/${review.slackFileId}`}
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
          <form onSubmit={submitComment} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 mb-8 mx-auto" style={{ maxWidth: 600 }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#8B95B0]">
                Commenting at <span className="text-[#5B4EE8] font-medium">{formatTime(addingAt)}</span>
              </span>
              <button
                type="button"
                onClick={() => setAddingAt(null)}
                className="flex items-center justify-center bg-white hover:bg-red-50 transition-colors text-red-400 hover:text-red-500"
                style={{ border: '1px solid #D4DEE9', borderRadius: 6, width: 24, height: 24 }}
                title="Cancel"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="1,3 13,3"/>
                  <path d="M4,3V2a1,1 0 011-1h4a1,1 0 011,1v1"/>
                  <path d="M2,3l0.9,9.1A1,1 0 004,13h6a1,1 0 001.1-.9L12,3"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <textarea
                placeholder="Your feedback..."
                value={newComment.text}
                onChange={(e) => setNewComment((prev) => ({ ...prev, text: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors resize-none"
                rows={3}
                required
              />
              <input
                type="text"
                placeholder="Your name"
                value={newComment.author}
                onChange={(e) => setNewComment((prev) => ({ ...prev, author: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#5B4EE8] hover:bg-[#4D42D4] text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Posting...' : 'Post feedback'}
            </button>
          </form>
        )}

        <div className="mx-auto" style={{ maxWidth: 600 }}>
        {/* Comment count + toggle */}
        <div className="flex items-center justify-between mb-5" style={{ paddingLeft: 16, paddingRight: 16 }}>
          <p className="text-sm font-bold text-[#8B95B0]">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </p>
          <button
            onClick={() => setShowResolved(prev => !prev)}
            className="flex items-center gap-2"
          >
            <div
              className="relative transition-colors"
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                backgroundColor: showResolved ? '#5B4EE8' : '#D4DEE9',
                transition: 'background-color 0.2s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: showResolved ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              />
            </div>
            <span className="text-sm font-semibold text-[#2D3561]">Show resolved</span>
          </button>
        </div>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-8 text-center">
            <p className="text-sm text-[#8B95B0]">No feedback yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...comments].filter(c => showResolved || !resolvedIds.has(c.id)).sort((a, b) => Number(resolvedIds.has(a.id)) - Number(resolvedIds.has(b.id))).map((comment) => {
              const resolved = resolvedIds.has(comment.id)
              return (
                <div key={comment.id} className="bg-white border border-gray-200 rounded-xl transition-opacity" style={{ padding: 16, opacity: resolved ? 0.4 : 1 }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
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
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleResolved(comment.id)}
                        className="flex items-center gap-1.5 bg-white hover:bg-gray-50 transition-colors px-2 flex-shrink-0"
                        style={{ border: '1px solid #D4DEE9', borderRadius: 6, height: 24, color: '#1A2C44' }}
                      >
                        <span className="text-xs font-semibold" style={{ fontFamily: 'inherit' }}>Mark as resolved</span>
                        {resolved ? (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="#5B4EE8" strokeWidth="1.5"/>
                            <polyline points="5,8 7,10.5 11,5.5" stroke="#5B4EE8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="#D4DEE9" strokeWidth="1.5"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="flex items-center justify-center bg-white hover:bg-red-50 transition-colors text-red-400 hover:text-red-500"
                        style={{ border: '1px solid #D4DEE9', borderRadius: 6, width: 24, height: 24 }}
                        title="Delete comment"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <polyline points="1,3 13,3"/>
                          <path d="M4,3V2a1,1 0 011-1h4a1,1 0 011,1v1"/>
                          <path d="M2,3l0.9,9.1A1,1 0 004,13h6a1,1 0 001.1-.9L12,3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="leading-relaxed" style={{ fontSize: 14, color: '#2D3561' }}>{comment.text}</p>
                  <p className="mt-3" style={{ fontSize: 12, fontFamily: 'monospace', color: '#8B95B0' }}>{comment.author}</p>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
