import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { createOAuth2Client } from '@/lib/gmail/auth'
import { decryptToken } from '@/lib/crypto'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { gmailConnection: true },
  })

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Revoke Gmail token if connected
  if (dbUser.gmailConnection) {
    try {
      const accessToken = decryptToken(dbUser.gmailConnection.accessToken)
      const oauth2Client = createOAuth2Client()
      oauth2Client.setCredentials({ access_token: accessToken })
      await oauth2Client.revokeCredentials()
    } catch {
      // Continue even if revocation fails
    }
  }

  // Delete all user data (cascades via Prisma relations)
  await prisma.user.delete({ where: { id: dbUser.id } })

  // Delete from Supabase auth (requires service role)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await adminClient.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}
