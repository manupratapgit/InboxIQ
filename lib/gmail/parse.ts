import { gmail_v1 } from 'googleapis'

export interface GmailThread {
  id: string
  subject: string
  sender: string
  date: string
  snippet: string
  hasSentReply: boolean
  body?: string
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractBody(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return ''

  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBase64(part.body.data)
  }

  if (part.parts) {
    for (const subpart of part.parts) {
      const body = extractBody(subpart)
      if (body) return body
    }
  }

  return ''
}

export function parseThread(thread: gmail_v1.Schema$Thread): GmailThread {
  const messages = thread.messages ?? []
  const firstMsg = messages[0]
  const headers = firstMsg?.payload?.headers ?? []

  const subject = getHeader(headers, 'Subject') || '(no subject)'
  const sender = getHeader(headers, 'From')
  const date = getHeader(headers, 'Date')
  const snippet = firstMsg?.snippet ?? ''

  const hasSentReply = messages.some(msg =>
    msg.labelIds?.includes('SENT')
  )

  const body = extractBody(firstMsg?.payload)

  return {
    id: thread.id!,
    subject,
    sender,
    date,
    snippet,
    hasSentReply,
    body: body.slice(0, 500),
  }
}
