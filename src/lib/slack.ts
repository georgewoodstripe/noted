const SLACK_API = 'https://slack.com/api'

function getToken() {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN is not set. Add it to your .env.local file.')
  return token
}

export async function resolveSlackMessageUrl(messageUrl: string) {
  const match = messageUrl.match(/archives\/([A-Z0-9]+)\/p(\d{16})/)
  if (!match) {
    throw new Error(
      'Invalid Slack message URL. Expected format: https://[workspace].slack.com/archives/[channelId]/p[timestamp]'
    )
  }

  const channelId = match[1]
  const rawTs = match[2]
  const ts = `${rawTs.slice(0, 10)}.${rawTs.slice(10)}`

  const token = getToken()

  const res = await fetch(
    `${SLACK_API}/conversations.history?channel=${channelId}&latest=${ts}&inclusive=true&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()

  if (!data.ok) {
    if (data.error === 'not_in_channel')
      throw new Error("Bot is not in that channel. Invite it with /invite @noted")
    if (data.error === 'channel_not_found')
      throw new Error('Channel not found. Make sure the URL is correct and the bot is invited.')
    throw new Error(`Slack API error: ${data.error}`)
  }

  const message = data.messages?.[0]
  if (!message) throw new Error('Message not found')

  const file = message.files?.[0]
  if (!file) throw new Error('No file attachment found in this message')
  if (!file.mimetype?.startsWith('video/'))
    throw new Error(`The attachment is not a video (found: ${file.mimetype ?? 'unknown'})`)

  return {
    fileId: file.id as string,
    title: (file.title || file.name) as string,
    uploaderName: (file.username || file.user || 'Unknown') as string,
    urlPrivate: file.url_private as string,
    mimetype: file.mimetype as string,
  }
}

export async function getSlackFileInfo(fileId: string): Promise<{ url: string; mimetype: string }> {
  const token = getToken()
  const res = await fetch(`${SLACK_API}/files.info?file=${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`)
  return {
    url: data.file.url_private as string,
    mimetype: data.file.mimetype as string,
  }
}
