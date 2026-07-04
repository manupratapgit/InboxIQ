import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

// @ts-expect-error adapter type mismatch between neon versions
const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
// @ts-expect-error adapter type mismatch
const adapter = new PrismaNeon(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'dev@inboxiq.app' },
    update: {},
    create: {
      email: 'dev@inboxiq.app',
      name: 'Dev User',
      supabaseId: 'dev-supabase-id-001',
      preferences: {
        create: {
          digestTime: '08:00',
          timezone: 'Asia/Kolkata',
          digestEnabled: true,
          digestTone: 'detailed',
        },
      },
    },
  })

  console.log('Seeded user:', user.email)

  // Seed a sample digest
  await prisma.digest.upsert({
    where: { id: 'sample-digest-001' },
    update: {},
    create: {
      id: 'sample-digest-001',
      userId: user.id,
      date: new Date(),
      status: 'sent',
      rawEmailCount: 12,
      summaryMarkdown: `## Daily Email Digest — ${new Date().toDateString()}\n12 threads scanned · 2 urgent · 4 important\n\n### 🚨 URGENT — action today\n- No urgent emails today\n\n### 📌 IMPORTANT — this week\n- Sample important email from team\n\n### 📋 FYI — 8 items\n- Newsletter, notifications, and updates\n\n### 🗑️ IGNORE — 2 items`,
      summaryHtml: '<h2>Sample Digest</h2><p>This is a seed digest for development.</p>',
      generatedAt: new Date(),
      sentAt: new Date(),
    },
  })

  console.log('Seed complete!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
