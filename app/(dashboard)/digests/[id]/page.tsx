import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DigestViewer } from '@/components/DigestViewer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DigestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user!.id } })
  if (!dbUser) notFound()

  const digest = await prisma.digest.findFirst({
    where: { id, userId: dbUser.id },
  })
  if (!digest) notFound()

  const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    sent: 'success', generating: 'warning', failed: 'error', pending: 'default',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/digests" className="text-sm text-gray-500 hover:text-gray-900">← Digests</Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {new Date(digest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {digest.rawEmailCount != null ? `${digest.rawEmailCount} emails scanned` : 'No emails'} ·{' '}
            {digest.sentAt ? `Sent at ${new Date(digest.sentAt).toLocaleTimeString()}` : 'Not yet sent'}
          </p>
        </div>
        <Badge variant={statusVariant[digest.status] ?? 'default'}>{digest.status}</Badge>
      </div>

      {digest.status === 'failed' && digest.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <strong>Error:</strong> {digest.errorMessage}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <DigestViewer digest={digest} />
        </CardContent>
      </Card>
    </div>
  )
}
