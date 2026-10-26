import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { messagingApi } from '../api/messaging'
import { useAuth } from '../context/AuthContext'

const POLL_INTERVAL_MS = 3000

function mergeMessages(current, received) {
  const byId = new Map(current.map((message) => [String(message.id), message]))
  received.forEach((message) => byId.set(String(message.id), message))
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

function latestId(messages) {
  return messages.reduce((largest, message) => Math.max(largest, Number(message.id) || 0), 0)
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

function ConversationThread({ conversationId }) {
  const { user } = useAuth()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState('')
  const cursorRef = useRef(0)
  const listRef = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    let active = true
    let polling = false
    let intervalId
    mountedRef.current = true
    cursorRef.current = 0
    setLoading(true)
    setError('')
    setPollError('')
    setConversation(null)
    setMessages([])

    async function fetchNewMessages() {
      if (!active || polling || document.visibilityState === 'hidden') return
      polling = true
      try {
        const incoming = await messagingApi.newerMessages(conversationId, cursorRef.current)
        if (active) {
          if (incoming.length) {
            cursorRef.current = Math.max(cursorRef.current, latestId(incoming))
            setMessages((previous) => mergeMessages(previous, incoming))
          }
          setPollError('')
        }
      } catch (err) {
        if (active) setPollError(err.message)
      } finally {
        polling = false
      }
    }

    async function initialize() {
      try {
        // The detail endpoint also enforces participant-only authorization.
        const [details, history] = await Promise.all([
          messagingApi.conversation(conversationId),
          messagingApi.history(conversationId),
        ])
        if (!active) return
        setConversation(details)
        setMessages(mergeMessages([], history))
        cursorRef.current = latestId(history)
        intervalId = window.setInterval(fetchNewMessages, POLL_INTERVAL_MS)
      } catch (err) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()

    return () => {
      active = false
      mountedRef.current = false
      window.clearInterval(intervalId)
    }
  }, [conversationId])

  useEffect(() => {
    const container = listRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages.length])

  async function handleSend(event) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending || loading || !conversation) return

    setSending(true)
    setError('')
    try {
      const saved = await messagingApi.send(conversationId, trimmed)
      if (!mountedRef.current) return
      setMessages((previous) => mergeMessages(previous, [saved]))
      // Do not advance the poll cursor here: a reply with a smaller ID
      // could have arrived before this POST, but after the last poll.
      setText('')
    } catch (err) {
      if (mountedRef.current) setError(err.message)
    } finally {
      if (mountedRef.current) setSending(false)
    }
  }

  const contactId = conversation && (
    String(conversation.buyer) === String(user?.id)
      ? conversation.seller : conversation.buyer
  )

  return (
    <div className="max-w-3xl">
      <Link to="/messages" className="mb-4 inline-block text-sm text-blue-700 hover:underline">
        ← All messages
      </Link>
      {loading ? (
        <p className="text-sm text-slate-600">Loading messages...</p>
      ) : !conversation ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || 'Conversation not found.'}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">Conversation</h1>
              <p className="mt-1 text-sm text-slate-600">
                Property #{conversation.property} · Chat with user #{contactId}
              </p>
            </div>
            <Link to={`/properties/${conversation.property}`} className="text-sm text-blue-700 underline">
              View property
            </Link>
          </div>

          <div
            ref={listRef}
            aria-label="Message history"
            className="mb-3 h-96 overflow-y-auto rounded border border-slate-200 bg-white p-4"
          >
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No messages yet. Send the first message.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const mine = String(message.sender) === String(user?.id)
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded border px-3 py-2 sm:max-w-[75%] ${
                        mine ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
                      }`}>
                        <p className="whitespace-pre-wrap break-words text-sm text-slate-900">{message.text}</p>
                        <p className="mt-1 text-right text-xs text-slate-500">
                          {mine ? 'You' : `User #${message.sender}`} · {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {pollError && (
            <p role="status" className="mb-3 text-sm text-amber-700">
              Could not check for new messages: {pollError}. Retrying automatically.
            </p>
          )}
          {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSend} className="flex items-end gap-2">
            <label htmlFor="message-text" className="sr-only">Message</label>
            <textarea
              id="message-text"
              rows={2}
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a message..."
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">New messages are checked every 3 seconds while this chat is open.</p>
        </>
      )}
    </div>
  )
}

export default function ConversationPage() {
  const { conversationId } = useParams()
  // Reset local state if the user navigates between different conversations.
  return <ConversationThread key={conversationId} conversationId={conversationId} />
}
