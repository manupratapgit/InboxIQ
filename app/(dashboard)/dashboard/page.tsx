import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { GmailConnectButton } from '@/components/GmailConnectButton'
import { DigestCard } from '@/components/DigestCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user!.id },
    include: {
      gmailConnection: true,
      preferences: true,
      digests: { orderBy: { date: 'desc' }, take: 3 },
    },
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const name = dbUser?.name || user?.email?.split('@')[0] || 'there'
  const totalDigests = await prisma.digest.count({ where: { userId: dbUser?.id } })
  const sentDigests = await prisma.digest.count({ where: { userId: dbUser?.id, status: 'sent' } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting()}, {name} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Here's your InboxIQ overview</p>
      </div>

      {params.connected === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          ✓ Gmail connected successfully!
        </div>
      )}
      {params.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          Error: {params.error.replace(/_/g, ' ')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total digests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalDigests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Successfully sent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{sentDigests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Next digest</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {dbUser?.preferences?.digestEnabled
                ? `${dbUser.preferences.digestTime} ${dbUser.preferences.timezone}`
                : 'Disabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gmail Connection</CardTitle>
        </CardHeader>
        <CardContent>
          {dbUser?.gmailConnection?.isActive ? (
            <GmailConnectButton connected gmailEmail={dbUser.gmailConnection.gmailEmail} />
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">Connect your Gmail to start receiving AI digests.</p>
              <GmailConnectButton connected={false} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Digests</CardTitle>
            <Link href="/digests" className="text-xs text-gray-500 hover:text-gray-900">View all →</Link>
          </div>
        </CardHeader>
        <CardContent>
          {dbUser?.digests.length ? (
            <div className="space-y-2">
              {dbUser.digests.map(d => <DigestCard key={d.id} digest={d} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No digests yet. Connect Gmail and your first digest will arrive at your scheduled time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
