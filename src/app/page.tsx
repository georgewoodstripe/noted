'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/review/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold text-white tracking-tight mb-2">noted</h1>
          <p className="text-zinc-400">Timestamped video feedback for design teams</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Paste a Slack video message URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourworkspace.slack.com/archives/C.../p..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full bg-white text-zinc-950 rounded-lg px-4 py-3 font-medium text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating review page...' : 'Create review page →'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Video streams directly from Slack. Make sure your bot is invited to the channel.
        </p>
      </div>
    </main>
  )
}
