'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { Review, Comment } from '../generated/prisma'

type ReviewWithComments = Review & { comments: Comment[] }

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoReview({ review }: { review: ReviewWithComments }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [comments, setComments] = useState<Comment[]>(review.comments)
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

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    seekTo(((e.clientX - rect.left) / rect.width) * duration)
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight hover:text-zinc-300 transition-colors">
          noted
        </Link>
        <span className="text-sm text-zinc-500">Shared by {review.uploaderName}</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-medium mb-6">{review.title}</h1>

        {/* Video */}
        <div className="bg-black rounded-t-xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            src={`/api/slack/proxy/${review.slackFileId}`}
            className="w-full h-full object-contain cursor-pointer"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 rounded-b-xl border-t border-zinc-800 px-4 pt-3 pb-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-zinc-300 transition-colors w-6 text-center"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className="text-zinc-400 text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Timeline */}
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-1.5 bg-zinc-700 rounded-full cursor-pointer"
          >
            {/* Playback fill */}
            <div
              className="absolute left-0 top-0 h-full bg-white rounded-full pointer-events-none"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            {/* Comment markers */}
            {comments.map((comment) => (
              <button
                key={comment.id}
                onClick={(e) => { e.stopPropagation(); seekTo(comment.timestamp) }}
                style={{ left: duration ? `${(comment.timestamp / duration) * 100}%` : '0%' }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full hover:scale-125 transition-transform z-10"
                title={`${formatTime(comment.timestamp)} — ${comment.author}: ${comment.text}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add comment */}
          <div className="lg:col-span-1">
            {addingAt === null ? (
              <button
                onClick={() => {
                  videoRef.current?.pause()
                  setAddingAt(currentTime)
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-left transition-colors"
              >
                <span className="text-zinc-400">Leave feedback at </span>
                <span className="text-yellow-400 font-medium tabular-nums">{formatTime(currentTime)}</span>
              </button>
            ) : (
              <form
                onSubmit={submitComment}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">
                    Commenting at{' '}
                    <span className="text-yellow-400 font-medium tabular-nums">{formatTime(addingAt)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingAt(null)}
                    className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                  >
                    cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Your name"
                  value={newComment.author}
                  onChange={(e) => setNewComment((prev) => ({ ...prev, author: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  required
                />
                <textarea
                  placeholder="Your feedback..."
                  value={newComment.text}
                  onChange={(e) => setNewComment((prev) => ({ ...prev, text: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                  rows={3}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-zinc-950 rounded px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post feedback'}
                </button>
              </form>
            )}
          </div>

          {/* Comments list */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-medium text-zinc-500 mb-3">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </h2>
            {comments.length === 0 ? (
              <p className="text-zinc-600 text-sm">No feedback yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-zinc-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() => seekTo(comment.timestamp)}
                        className="text-yellow-400 text-xs font-medium tabular-nums hover:text-yellow-300 transition-colors"
                      >
                        ▶ {formatTime(comment.timestamp)}
                      </button>
                      <span className="text-white text-sm font-medium">{comment.author}</span>
                    </div>
                    <p className="text-zinc-300 text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
