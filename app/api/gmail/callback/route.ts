import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/gmail/auth'
import { encryptToken } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('gmail_oauth_state')?.value

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${origin}/dashboard?error=invalid_state`)
  }

  cookieStore.delete('gmail_oauth_state')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) {
    return NextResponse.redirect(`${origin}/dashboard?error=user_not_found`)
  }

  const { tokens, gmailEmail } = await exchangeCodeForTokens(code)

  await prisma.gmailConnection.upsert({
    where: { userId: dbUser.id },
    update: {
      gmailEmail,
      accessToken: encryptToken(tokens.access_token!),
      refreshToken: encryptToken(tokens.refresh_token!),
      tokenExpiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope!,
      isActive: true,
    },
    create: {
      userId: dbUser.id,
      gmailEmail,
      accessToken: encryptToken(tokens.access_token!),
      refreshToken: encryptToken(tokens.refresh_token!),
      tokenExpiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope!,
    },
  })

  // Ensure preferences exist
  await prisma.userPreferences.upsert({
    where: { userId: dbUser.id },
    update: {},
    create: { userId: dbUser.id },
  })

  return NextResponse.redirect(`${origin}/dashboard?connected=true`)
}
