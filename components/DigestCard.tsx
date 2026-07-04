import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Digest } from '@prisma/client'

interface DigestCardProps {
  digest: Digest
}

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  sent: 'success',
  generating: 'warning',
  failed: 'error',
  pending: 'default',
}

export function DigestCard({ digest }: DigestCardProps) {
  const preview = digest.summaryMarkdown?.split('\n').find(l => l.trim() && !l.startsWith('#'))

  return (
    <Link href={`/digests/${digest.id}`} className="block">
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {new Date(digest.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {preview && (
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{preview}</p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          {digest.rawEmailCount != null && (
            <span className="text-xs text-gray-500">{digest.rawEmailCount} emails</span>
          )}
          <Badge variant={statusVariant[digest.status] ?? 'default'}>{digest.status}</Badge>
        </div>
      </div>
    </Link>
  )
}
