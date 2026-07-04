'use client'

import { Digest } from '@prisma/client'

interface DigestViewerProps {
  digest: Digest
}

export function DigestViewer({ digest }: DigestViewerProps) {
  if (!digest.summaryHtml) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No content available for this digest.</p>
      </div>
    )
  }

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: digest.summaryHtml }}
    />
  )
}
