'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface GmailConnectButtonProps {
  connected: boolean
  gmailEmail?: string
}

export function GmailConnectButton({ connected, gmailEmail }: GmailConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Gmail account? You will stop receiving digests.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'POST' })
      if (res.ok) window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  if (connected && gmailEmail) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-gray-700">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          {gmailEmail}
        </span>
        <Button variant="outline" size="sm" loading={loading} onClick={handleDisconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <a href="/api/gmail/connect">
      <Button size="md">
        <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.908 8.908 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
        </svg>
        Connect Gmail
      </Button>
    </a>
  )
}
