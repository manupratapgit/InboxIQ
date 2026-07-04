import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { GmailConnectButton } from '@/components/GmailConnectButton'
import { PreferenceForm } from '@/components/PreferenceForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteAccountButton } from './DeleteAccountButton'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user!.id },
    include: { gmailConnection: true, preferences: true },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and digest preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Gmail Account</CardTitle></CardHeader>
        <CardContent>
          {dbUser?.gmailConnection?.isActive ? (
            <GmailConnectButton connected gmailEmail={dbUser.gmailConnection.gmailEmail} />
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-3">No Gmail account connected.</p>
              <GmailConnectButton connected={false} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Digest Preferences</CardTitle></CardHeader>
        <CardContent>
          <PreferenceForm preferences={dbUser?.preferences ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-red-600">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data.</p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  )
}
