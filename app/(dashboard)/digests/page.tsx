import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DigestCard } from '@/components/DigestCard'

export default async function DigestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user!.id } })

  const digests = dbUser
    ? await prisma.digest.findMany({
        where: { userId: dbUser.id },
        orderBy: { date: 'desc' },
        take: 50,
      })
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Digest History</h1>
        <p className="text-sm text-gray-500 mt-1">All your past email digests</p>
      </div>

      {digests.length > 0 ? (
        <div className="space-y-2">
          {digests.map(d => <DigestCard key={d.id} digest={d} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No digests yet. Your first one will arrive at your scheduled time.</p>
        </div>
      )}
    </div>
  )
}
