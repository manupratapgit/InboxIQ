import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchRecentThreads } from '@/lib/gmail/fetch'
import { generateDigest } from '@/lib/claude/summarize'
import { sendDigestEmail } from '@/lib/email/send'
import { decryptToken } from '@/lib/crypto'

export async function POST(request: Request) {
  // Validate Trigger.dev signature
  const signature = request.headers.get('x-trigger-signature')
  if (!signature || signature !== process.env.TRIGGER_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await request.json()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gmailConnection: true, preferences: true },
  })

  if (!user?.gmailConnection || !user.preferences) {
    return NextResponse.json({ error: 'User not ready' }, { status: 400 })
  }

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

    return NextResponse.json({ success: true })
  } catch (err) {
    await prisma.digest.update({
      where: { id: digest.id },
      data: { status: 'failed', errorMessage: String(err) },
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
