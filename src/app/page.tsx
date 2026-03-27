'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NotedLogo from '@/components/NotedLogo'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <NotedLogo width={159} />
          </div>
          <p className="font-mono text-[#2D3561] text-sm leading-relaxed">
            Timestamped video feedback<br />for design teams.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#2D3561] mb-2">
                Paste your video URL from Slack
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourworkplace.slack.com/..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className="w-full bg-[#5B4EE8] hover:bg-[#4D42D4] text-white rounded-lg px-4 py-2.5 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating review...' : 'Create review'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-[#8B95B0] leading-relaxed">
          Video streams directly from Slack.<br />Make sure your bot is invited to the channel.
        </p>
      </div>
    </main>
  )
}
