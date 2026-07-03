import { schedules, task } from '@trigger.dev/sdk/v3'
import { prisma } from '@/lib/prisma'
import { fetchRecentThreads } from '@/lib/gmail/fetch'
import { generateDigest } from '@/lib/claude/summarize'
import { sendDigestEmail } from '@/lib/email/send'
import { decryptToken } from '@/lib/crypto'

function getLocalTime(now: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(now)
}

export const digestScheduleTask = schedules.task({
  id: 'daily-digest',
  cron: '0 * * * *',
  run: async () => {
    const now = new Date()

    const users = await prisma.user.findMany({
      where: {
        preferences: { digestEnabled: true },
        gmailConnection: { isActive: true },
      },
      include: {
        preferences: true,
        gmailConnection: true,
      },
    })

    const dueUsers = users.filter(user => {
      const localTime = getLocalTime(now, user.preferences!.timezone)
      return localTime === user.preferences!.digestTime
    })

    await Promise.all(
      dueUsers.map(user => singleUserDigestTask.trigger({ userId: user.id }))
    )

    return { processed: dueUsers.length }
  },
})

export const singleUserDigestTask = task({
  id: 'single-user-digest',
  retry: { maxAttempts: 3, factor: 2 },
  run: async ({ userId }: { userId: string }) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { gmailConnection: true, preferences: true },
    })

    if (!user?.gmailConnection || !user.preferences) {
      throw new Error(`User ${userId} missing Gmail connection or preferences`)
    }

    // Prevent duplicate digests for today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const existing = await prisma.digest.findFirst({
      where: {
        userId,
        date: { gte: todayStart },
        status: { in: ['sent', 'generating'] },
      },
    })
    if (existing) return { skipped: true, reason: 'already sent today' }

    const digest = await prisma.digest.create({
      data: { userId, date: new Date(), status: 'generating' },
    })

    try {
      const accessToken = decryptToken(user.gmailConnection.accessToken)
      const refreshToken = decryptToken(user.gmailConnection.refreshToken)
      const threads = await fetchRecentThreads(accessToken, refreshToken, 24, userId)

      const { markdown, html } = await generateDigest(threads, user.preferences, user.name || user.email)

      await sendDigestEmail({
        to: user.email,
        userName: user.name || 'there',
        digestHtml: html,
        digestDate: new Date(),
      })

      await prisma.digest.update({
        where: { id: digest.id },
        data: {
          status: 'sent',
          summaryMarkdown: markdown,
          summaryHtml: html,
          rawEmailCount: threads.length,
          generatedAt: new Date(),
          sentAt: new Date(),
        },
      })

      return { success: true, emailCount: threads.length }
    } catch (err) {
      await prisma.digest.update({
        where: { id: digest.id },
        data: { status: 'failed', errorMessage: String(err) },
      })
      throw err
    }
  },
})
