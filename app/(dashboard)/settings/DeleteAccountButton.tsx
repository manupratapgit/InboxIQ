'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Are you sure? This will permanently delete your account and all digests. This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (res.ok) {
        await supabase.auth.signOut()
        router.push('/login?deleted=true')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="destructive" size="sm" loading={loading} onClick={handleDelete}>
      Delete account
    </Button>
  )
}
