import { useEffect, useState } from 'react'
import { apiImageBlob } from '../api/client'

/** Downloads a private image with JWT and releases its temporary browser URL. */
export default function AuthenticatedPropertyImage({ propertyId, imageId, alt, className = '' }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propertyId == null || imageId == null) {
      setLoading(false)
      setError('Image unavailable')
      return
    }

    let cancelled = false
    let objectUrl = ''
    const controller = new AbortController()

    setUrl('')
    setError('')
    setLoading(true)

    const path = `/api/properties/${encodeURIComponent(propertyId)}/images/${encodeURIComponent(imageId)}/`

    apiImageBlob(path, { signal: controller.signal })
      .then((blob) => {
        const nextUrl = URL.createObjectURL(blob)
        if (cancelled) URL.revokeObjectURL(nextUrl)
        else {
          objectUrl = nextUrl
          setUrl(nextUrl)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Image unavailable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [propertyId, imageId])

  if (loading || error || !url) {
    return (
      <div role="img" aria-label={alt || 'Property photo'}
        className={`flex items-center justify-center bg-slate-100 p-3 text-center text-xs text-slate-500 ${className}`}>
        {loading ? 'Loading photo...' : (error || 'Image unavailable')}
      </div>
    )
  }

  return <img src={url} alt={alt || 'Property photo'} className={className} loading="lazy" />
}
