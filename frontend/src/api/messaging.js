import { apiRequest } from './client'

// Handles both DRF's paginated { results, next } responses and plain arrays.
// Pagination links are reduced to local /api paths, so requests keep using Vite's proxy.
async function allPages(path) {
  const expectedPath = new URL(path, window.location.origin).pathname
  const records = []
  const visited = new Set()
  let next = path

  while (next) {
    const url = new URL(next, window.location.origin)
    if (url.pathname !== expectedPath) {
      throw new Error('Unexpected pagination link from the server.')
    }

    const localPath = url.pathname + url.search
    if (visited.has(localPath)) {
      throw new Error('Repeated pagination link from the server.')
    }
    visited.add(localPath)

    const response = await apiRequest(localPath)
    if (Array.isArray(response)) {
      records.push(...response)
      break
    }
    if (!response || !Array.isArray(response.results)) {
      throw new Error('Unexpected message API response.')
    }
    records.push(...response.results)
    next = response.next || null
  }

  return records
}

function basePath(conversationId) {
  return `/api/conversations/${encodeURIComponent(conversationId)}/messages/`
}

export const messagingApi = {
  conversations() {
    return allPages('/api/conversations/')
  },
  startConversation(propertyId) {
    return apiRequest('/api/conversations/', {
      method: 'POST',
      data: { property: propertyId },
    })
  },
  conversation(conversationId) {
    return apiRequest(`/api/conversations/${encodeURIComponent(conversationId)}/`)
  },
  // Initial load: retrieve all pages before setting the after_id cursor.
  history(conversationId) {
    return allPages(basePath(conversationId))
  },
  // Polling: only request messages newer than the last received ID.
  newerMessages(conversationId, afterId) {
    const params = new URLSearchParams({ after_id: String(afterId) })
    return allPages(`${basePath(conversationId)}?${params.toString()}`)
  },
  send(conversationId, text) {
    return apiRequest(basePath(conversationId), {
      method: 'POST',
      data: { text },
    })
  },
}
