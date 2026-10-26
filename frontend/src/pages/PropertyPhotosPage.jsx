import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { propertiesApi } from '../api/properties'
import AuthenticatedPropertyImage from '../components/AuthenticatedPropertyImage'
import { useAuth } from '../context/AuthContext'
import { isPropertyOwner } from '../utils/ownership'

export default function PropertyPhotosPage() {
  const { propertyId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.justCreated ? 'Property created. You can upload photos now.' : '')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  async function reloadProperty() {
    const result = await propertiesApi.detail(propertyId)
    setProperty(result)
    return result
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    propertiesApi.detail(propertyId)
      .then((result) => { if (active) setProperty(result) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId])

  const authorized = isPropertyOwner(property, user)
  const images = Array.isArray(property?.images) ? property.images.filter((image) => image?.id != null) : []

  async function upload(event) {
    event.preventDefault()
    if (!authorized || uploading || deletingId !== null) return
    const input = event.currentTarget.elements.namedItem('photos')
    const files = Array.from(input?.files ?? [])
    if (!files.length) {
      setError('Choose at least one image.')
      return
    }
    setError('')
    setNotice('')
    setUploading(true)
    let uploaded = 0
    try {
      for (const file of files) {
        await propertiesApi.uploadImage(propertyId, file)
        uploaded += 1
      }
      setNotice(`${uploaded} photo${uploaded === 1 ? '' : 's'} uploaded.`)
      input.value = ''
    } catch (err) {
      setError(`${err.message} (${uploaded} of ${files.length} photos uploaded.)`)
    } finally {
      // Some uploads may have succeeded before an error: always fetch the latest images.
      try {
        await reloadProperty()
      } catch (err) {
        setError((previous) => `${previous} ${err.message}`.trim())
      }
      setUploading(false)
    }
  }

  async function removeImage(image) {
    if (!authorized || uploading || deletingId !== null) return
    if (!window.confirm('Delete this photo permanently?')) return
    setError('')
    setNotice('')
    setDeletingId(image.id)
    try {
      await propertiesApi.deleteImage(propertyId, image.id)
      await reloadProperty()
      setNotice('Photo deleted.')
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <Link to="/my-properties" className="text-sm text-blue-700 hover:underline">← My listings</Link>
      <h1 className="mb-2 mt-4 text-2xl font-semibold">Manage photos</h1>
      {loading ? <p className="text-sm text-slate-600">Loading property...</p> : error && !property ? (
        <p role="alert" className="text-sm text-red-700">{error}</p>
      ) : !property ? (
        <p className="text-sm text-slate-600">Property not found.</p>
      ) : !authorized ? (
        <p role="alert" className="text-sm text-red-700">Only the property owner can manage these photos.</p>
      ) : (
        <>
          <p className="mb-5 text-sm text-slate-600">{property.title} · <Link to={`/properties/${property.id}`} className="text-blue-700 underline">View listing</Link></p>
          <form onSubmit={upload} className="mb-6 rounded border border-slate-200 bg-white p-4">
            <label htmlFor="photos" className="mb-2 block text-sm font-medium">Upload property photos</label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple required disabled={uploading || deletingId !== null}
              className="block w-full text-sm file:mr-3 file:rounded file:border file:border-slate-300 file:bg-white file:px-3 file:py-2" />
            <p className="my-3 text-xs text-slate-500">JPEG, PNG or another image format accepted by your Django backend. Each photo is uploaded separately.</p>
            <button type="submit" disabled={uploading || deletingId !== null}
              className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload photos'}
            </button>
          </form>
          {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
          {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <h2 className="mb-3 text-lg font-semibold">Existing photos ({images.length})</h2>
          {images.length === 0 ? (
            <p className="text-sm text-slate-600">No photos have been uploaded yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {images.map((image, index) => (
                <div key={image.id} className="rounded border border-slate-200 bg-white p-3">
                  <AuthenticatedPropertyImage propertyId={property.id} imageId={image.id}
                    alt={`${property.title} photo ${index + 1}`}
                    className="h-48 w-full rounded border border-slate-200 object-cover" />
                  <button type="button" disabled={uploading || deletingId !== null} onClick={() => removeImage(image)}
                    className="mt-3 text-sm text-red-700 underline disabled:opacity-50">
                    {deletingId === image.id ? 'Deleting...' : 'Delete photo'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
