import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { fetchRecentThreads } from '@/lib/gmail/fetch'
import { generateDigest } from '@/lib/claude/summarize'
import { sendDigestEmail } from '@/lib/email/send'
import { decryptToken } from '@/lib/crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const lookbackHours: number = body.lookbackHours ?? 24

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { gmailConnection: true, preferences: true },
  })

  if (!dbUser?.gmailConnection) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
  }

  if (!dbUser.gmailConnection.isActive) {
    return NextResponse.json({ error: 'Gmail connection inactive' }, { status: 400 })
  }

  const preferences = dbUser.preferences ?? {
    id: '', userId: dbUser.id, digestTime: '07:00', timezone: 'Asia/Kolkata',
    digestEnabled: true, digestTone: 'detailed', includeUrgent: true,
    includeImportant: true, includeFyi: true, includeJobs: false,
    cvText: null, targetRoles: null, createdAt: new Date(), updatedAt: new Date(),
  }

  const digest = await prisma.digest.create({
    data: { userId: dbUser.id, date: new Date(), status: 'generating' },
  })

  try {
    const accessToken = decryptToken(dbUser.gmailConnection.accessToken)
    const refreshToken = decryptToken(dbUser.gmailConnection.refreshToken)
    const threads = await fetchRecentThreads(accessToken, refreshToken, lookbackHours, dbUser.id)

    const { markdown, html } = await generateDigest(threads, preferences, dbUser.name || dbUser.email)

    await sendDigestEmail({
      to: dbUser.email,
      userName: dbUser.name || 'there',
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

    return NextResponse.json({ success: true, emailCount: threads.length, digestId: digest.id })
  } catch (err) {
    await prisma.digest.update({
      where: { id: digest.id },
      data: { status: 'failed', errorMessage: String(err) },
    })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
