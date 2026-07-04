import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const preferencesSchema = z.object({
  digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  digestEnabled: z.boolean().optional(),
  digestTone: z.enum(['brief', 'detailed']).optional(),
  includeUrgent: z.boolean().optional(),
  includeImportant: z.boolean().optional(),
  includeFyi: z.boolean().optional(),
  includeJobs: z.boolean().optional(),
  targetRoles: z.string().optional(),
})

async function getDbUser(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: { preferences: true },
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await getDbUser(user.id)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ preferences: dbUser.preferences })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = preferencesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const dbUser = await getDbUser(user.id)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: dbUser.id },
    update: parsed.data,
    create: { userId: dbUser.id, ...parsed.data },
  })

  return NextResponse.json({ preferences })
}
