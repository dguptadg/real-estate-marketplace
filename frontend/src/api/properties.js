import { apiRequest } from './client'

// Django's authenticated property list endpoint accepts filters in the query string.
export const propertiesApi = {
  list(searchParams) {
    const query = searchParams?.toString()
    return apiRequest(`/api/properties/${query ? `?${query}` : ''}`)
  },
  detail(id) {
    return apiRequest(`/api/properties/${encodeURIComponent(id)}/`)
  },
  create(data) {
    return apiRequest('/api/properties/', { method: 'POST', data })
  },
  update(id, data) {
    return apiRequest(`/api/properties/${encodeURIComponent(id)}/`, { method: 'PATCH', data })
  },
  archive(id) {
    return apiRequest(`/api/properties/${encodeURIComponent(id)}/`, { method: 'DELETE' })
  },
  uploadImage(id, file) {
    const form = new FormData()
    form.append('image', file)
    return apiRequest(`/api/properties/${encodeURIComponent(id)}/images/`, {
      method: 'POST', data: form,
    })
  },
  deleteImage(id, imageId) {
    return apiRequest(`/api/properties/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}/`, {
      method: 'DELETE',
    })
  },
  // Until we build a dedicated "my properties" backend endpoint, read the
  // paginated active listings and filter by the current seller on the client.
  async allActive() {
    const properties = new Map()
    let nextPath = '/api/properties/'
    const visited = new Set()

    while (nextPath && !visited.has(nextPath)) {
      visited.add(nextPath)
      const result = await apiRequest(nextPath)
      const records = Array.isArray(result) ? result : result?.results
      if (!Array.isArray(records)) throw new Error('Unexpected property list response.')
      records.forEach((property) => properties.set(property.id, property))

      if (!result?.next) break
      // Django's pagination URL may be absolute. Always use the local /api proxy.
      const nextUrl = new URL(result.next, window.location.origin)
      if (nextUrl.pathname !== '/api/properties/') {
        throw new Error('Unexpected pagination URL from the server.')
      }
      nextPath = nextUrl.pathname + nextUrl.search
    }

    return [...properties.values()]
  },
}
