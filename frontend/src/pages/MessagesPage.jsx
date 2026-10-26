import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { messagingApi } from '../api/messaging'
import { useAuth } from '../context/AuthContext'

function otherParticipant(conversation, currentUser) {
  const isBuyer = String(conversation.buyer) === String(currentUser?.id)
  return isBuyer ? conversation.seller : conversation.buyer
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    messagingApi.conversations()
      .then((records) => {
        if (active) setConversations(records)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [reload])

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="mt-1 text-sm text-slate-600">Conversations about properties.</p>
        </div>
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading conversations...</p>
      ) : error ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : conversations.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-700">
          No conversations yet. Visit a property and click Contact Seller to start one.{' '}
          <Link to="/properties" className="text-blue-700 underline">Browse properties</Link>.
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/messages/${conversation.id}`}
              className="block p-4 hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-medium text-slate-900">Property #{conversation.property}</span>
                <span className="text-sm text-blue-700">Open chat</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Conversation with user #{otherParticipant(conversation, user)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
