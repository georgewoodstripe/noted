'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NotedLogo from '@/components/NotedLogo'

type Source = 'slack' | 'gdrive'

export default function Home() {
  const [source, setSource] = useState<Source>('slack')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleSourceChange(next: Source) {
    setSource(next)
    setUrl('')
    setError('')
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = source === 'gdrive' ? { videoUrl: url, title } : { slackUrl: url, title }
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          {/* Source tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => handleSourceChange('slack')}
              className="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: source === 'slack' ? 'white' : 'transparent',
                color: source === 'slack' ? '#2D3561' : '#8B95B0',
                boxShadow: source === 'slack' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Slack
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange('gdrive')}
              className="flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: source === 'gdrive' ? 'white' : 'transparent',
                color: source === 'gdrive' ? '#2D3561' : '#8B95B0',
                boxShadow: source === 'gdrive' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Google Drive
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#2D3561] mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Homepage redesign v2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B4EE8]/30 focus:border-[#5B4EE8] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2D3561] mb-2">
                {source === 'slack' ? 'Paste your video URL from Slack' : 'Paste your Google Drive video URL'}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={source === 'slack' ? 'https://yourworkplace.slack.com/...' : 'https://drive.google.com/file/d/...'}
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
          {source === 'slack'
            ? <>Video streams directly from Slack.<br />Make sure your bot is invited to the channel.</>
            : <>Make sure your Google Drive video is<br />shared with &ldquo;Anyone with the link&rdquo;.</>}
        </p>
      </div>
    </main>
  )
}
