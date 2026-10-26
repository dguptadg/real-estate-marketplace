// Uses Vite's /api proxy locally, or the hosted Django origin in production.
// This value is public (not a secret); Vite embeds it in the built frontend.
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

function apiUrl(path) {
  if (!path.startsWith('/api/')) {
    throw new Error('Only Django API paths are allowed.')
  }
  return `${API_ORIGIN}${path}`
}
const ACCESS_KEY = 'marketplace_access'
const REFRESH_KEY = 'marketplace_refresh'
export const SESSION_CLEARED_EVENT = 'marketplace:session-cleared'

let refreshPromise = null

export function hasSession() {
  return Boolean(sessionStorage.getItem(ACCESS_KEY) && sessionStorage.getItem(REFRESH_KEY))
}

export function clearSession() {
  const hadTokens = Boolean(sessionStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(REFRESH_KEY))
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  // Keep the React auth state in sync when an API request discovers an expired login.
  if (hadTokens && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT))
  }
}

function saveTokens(tokens) {
  if (!tokens?.access || !tokens?.refresh) {
    throw new Error('Login failed: access or refresh token missing.')
  }
  sessionStorage.setItem(ACCESS_KEY, tokens.access)
  sessionStorage.setItem(REFRESH_KEY, tokens.refresh)
}

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getError(data, status) {
  if (typeof data === 'string' && data.trim()) return data
  if (data?.detail) return String(data.detail)
  if (typeof data === 'object' && data !== null) {
    const message = Object.entries(data).map(([field, error]) => {
      const value = Array.isArray(error) ? error.join(' ') : String(error)
      return `${field === 'non_field_errors' ? 'Error' : field}: ${value}`
    }).join(' ')
    if (message) return message
  }
  return `Request failed (${status}).`
}

// A single refresh request is shared by simultaneous calls (e.g. multiple photos).
async function refreshAccess() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const originalRefresh = sessionStorage.getItem(REFRESH_KEY)
      if (!originalRefresh) return false
      try {
        const response = await fetch(apiUrl('/api/auth/refresh/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: originalRefresh }),
        })
        const data = await readBody(response)
        if (!response.ok || !data?.access) return false
        // Avoid restoring an old session if the user logged out while refreshing.
        if (sessionStorage.getItem(REFRESH_KEY) !== originalRefresh) return false
        sessionStorage.setItem(ACCESS_KEY, data.access)
        if (data.refresh) sessionStorage.setItem(REFRESH_KEY, data.refresh)
        return true
      } catch {
        return false
      }
    })().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function requestWithAuth(path, options = {}, authenticated = true) {
  async function send() {
    const accessUsed = authenticated ? sessionStorage.getItem(ACCESS_KEY) : null
    const headers = new Headers(options.headers || {})
    if (accessUsed) headers.set('Authorization', `Bearer ${accessUsed}`)
    const response = await fetch(apiUrl(path), { ...options, headers })
    return { response, accessUsed }
  }

  let result = await send()
  if (authenticated && result.response.status === 401) {
    // Another request may have already refreshed the token we just used.
    const newestAccess = sessionStorage.getItem(ACCESS_KEY)
    const alreadyRefreshed = Boolean(newestAccess && newestAccess !== result.accessUsed)
    if (alreadyRefreshed || await refreshAccess()) result = await send()

    if (result.response.status === 401 && sessionStorage.getItem(ACCESS_KEY) === result.accessUsed) {
      clearSession()
    }
  }
  return result.response
}

export async function apiRequest(path, { method = 'GET', data, authenticated = true } = {}) {
  const isFormData = data instanceof FormData
  const headers = { Accept: 'application/json' }
  if (data !== undefined && !isFormData) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await requestWithAuth(path, {
      method,
      headers,
      ...(data !== undefined ? { body: isFormData ? data : JSON.stringify(data) } : {}),
    }, authenticated)
  } catch {
    throw new Error('Cannot reach the Django backend. Check the API address and network connection.')
  }

  const body = await readBody(response)
  if (!response.ok) throw new Error(getError(body, response.status))
  return body
}

export const authApi = {
  async login(username, password) {
    const tokens = await apiRequest('/api/auth/login/', {
      method: 'POST', data: { username, password }, authenticated: false,
    })
    saveTokens(tokens)
  },
  register(values) {
    return apiRequest('/api/auth/register/', {
      method: 'POST', data: values, authenticated: false,
    })
  },
  profile() {
    return apiRequest('/api/auth/profile/')
  },
  updateProfile(values) {
    return apiRequest('/api/auth/profile/', { method: 'PATCH', data: values })
  },
}

// Image responses are binary FileResponses and require the same JWT handling.
export async function apiImageBlob(path, { signal } = {}) {
  let response
  try {
    response = await requestWithAuth(path, { signal })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot load photo. Check the Django API connection.')
  }

  if (!response.ok) {
    const body = await readBody(response)
    throw new Error(getError(body, response.status))
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('The server did not return a valid image response.')
  }
  return response.blob()
}
