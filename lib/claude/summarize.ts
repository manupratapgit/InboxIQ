import Anthropic from '@anthropic-ai/sdk'
import { marked } from 'marked'
import { GmailThread } from '@/lib/gmail/parse'
import { UserPreferences } from '@prisma/client'

const client = new Anthropic()

export async function generateDigest(
  threads: GmailThread[],
  preferences: UserPreferences,
  userName: string
): Promise<{ markdown: string; html: string }> {
  if (threads.length === 0) {
    const markdown = `## Daily Email Digest — ${new Date().toDateString()}\n\n✅ No new emails in the last 24 hours. Enjoy the quiet!`
    const html = await marked(markdown)
    return { markdown, html }
  }

  const systemPrompt = `You are an AI email assistant that generates a structured daily email digest.
Be ruthlessly concise. Total output must be under 500 words.
Use emoji section headers for scannability.
Every actionable item must have a direct Gmail deep link.
Format: markdown.`

  const toneInstruction = preferences.digestTone === 'brief'
    ? 'Keep summaries to one sentence max.'
    : 'Provide enough context to understand what action is needed.'

  const userPrompt = `Generate a daily email digest for ${userName} from the following ${threads.length} email threads.
Today: ${new Date().toDateString()}
Tone: ${toneInstruction}

THREADS:
${threads.map(t => `
---
Subject: ${t.subject}
From: ${t.sender}
Date: ${t.date}
Snippet: ${t.snippet}
ThreadId: ${t.id}
`).join('\n')}

SENT THREADS (mark as "Replied"):
${threads.filter(t => t.hasSentReply).map(t => `- ${t.subject} (replied)`).join('\n') || 'None'}

OUTPUT FORMAT:
## Daily Email Digest — [Today's Date]
[X] threads scanned · [X] urgent · [X] important

${preferences.includeUrgent ? `### 🚨 URGENT — action today
For each: sender | subject | one-line action | link: https://mail.google.com/mail/u/0/#inbox/[threadId]
` : ''}
${preferences.includeImportant ? `### 📌 IMPORTANT — this week
Same format as above.
` : ''}
${preferences.includeFyi ? `### 📋 FYI — [count] items
One line summary only, group similar items.
` : ''}
### 🗑️ IGNORE — [count] items
Count only.
`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const markdown = response.content[0].type === 'text' ? response.content[0].text : ''
  const html = await marked(markdown)

  return { markdown, html }
}
