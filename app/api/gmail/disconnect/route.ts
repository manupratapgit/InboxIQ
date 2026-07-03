import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createOAuth2Client } from '@/lib/gmail/auth'
import { decryptToken } from '@/lib/crypto'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { gmailConnection: true },
  })

  if (!dbUser?.gmailConnection) {
    return NextResponse.json({ error: 'No Gmail connection found' }, { status: 404 })
  }

  try {
    const accessToken = decryptToken(dbUser.gmailConnection.accessToken)
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })
    await oauth2Client.revokeCredentials()
  } catch {
    // Continue even if revocation fails — still remove from DB
  }

  await prisma.gmailConnection.delete({ where: { userId: dbUser.id } })

  return NextResponse.json({ success: true })
}
