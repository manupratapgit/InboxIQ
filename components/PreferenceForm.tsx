'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPreferences } from '@prisma/client'

interface PreferenceFormProps {
  preferences: UserPreferences | null
}

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
]

export function PreferenceForm({ preferences }: PreferenceFormProps) {
  const [form, setForm] = useState({
    digestTime: preferences?.digestTime ?? '07:00',
    timezone: preferences?.timezone ?? 'Asia/Kolkata',
    digestEnabled: preferences?.digestEnabled ?? true,
    digestTone: preferences?.digestTone ?? 'detailed',
    includeUrgent: preferences?.includeUrgent ?? true,
    includeImportant: preferences?.includeImportant ?? true,
    includeFyi: preferences?.includeFyi ?? true,
    includeJobs: preferences?.includeJobs ?? false,
    targetRoles: preferences?.targetRoles ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setForm(f => ({ ...f, [field]: !f[field as keyof typeof f] }))}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form[field] ? 'bg-black' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form[field] ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </label>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Digest Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Send time</label>
            <Input type="time" value={form.digestTime} onChange={e => setForm(f => ({ ...f, digestTime: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Timezone</label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              value={form.timezone}
              onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Digest tone</label>
          <div className="flex gap-2">
            {(['brief', 'detailed'] as const).map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => setForm(f => ({ ...f, digestTone: tone }))}
                className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${form.digestTone === tone ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        <Toggle field="digestEnabled" label="Daily digest enabled" />
        <Toggle field="includeUrgent" label="🚨 Urgent emails" />
        <Toggle field="includeImportant" label="📌 Important emails" />
        <Toggle field="includeFyi" label="📋 FYI emails" />
        <Toggle field="includeJobs" label="💼 Job search mode" />
      </div>

      {form.includeJobs && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target roles (comma-separated)</label>
          <Input
            placeholder="e.g. Senior PM, Product Manager"
            value={form.targetRoles}
            onChange={e => setForm(f => ({ ...f, targetRoles: e.target.value }))}
          />
        </div>
      )}

      <Button onClick={handleSave} loading={saving}>
        {saved ? '✓ Saved' : 'Save preferences'}
      </Button>
    </div>
  )
}
