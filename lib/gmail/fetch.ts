import { google } from 'googleapis'
import { GmailThread, parseThread } from './parse'

export async function fetchRecentThreads(
  accessToken: string,
  refreshToken: string,
  lookbackHours: number = 24,
  userId?: string
): Promise<GmailThread[]> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  if (userId) {
    const { saveNewRefreshToken } = await import('./auth')
    auth.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        saveNewRefreshToken(userId, tokens.refresh_token)
      }
    })
  }

  const gmail = google.gmail({ version: 'v1', auth })

  const [inboxRes] = await Promise.all([
    gmail.users.threads.list({
      userId: 'me',
      q: `newer_than:${lookbackHours}h -in:draft`,
      maxResults: 50,
    }),
  ])

  const threadItems = inboxRes.data.threads ?? []
  if (threadItems.length === 0) return []

  const threads = await Promise.all(
    threadItems.map(t =>
      gmail.users.threads.get({ userId: 'me', id: t.id!, format: 'full' })
    )
  )

  return threads.map(t => parseThread(t.data))
}
