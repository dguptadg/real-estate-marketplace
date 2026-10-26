import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { propertiesApi } from '../api/properties'
import PropertyCard from '../components/PropertyCard'
import { useAuth } from '../context/AuthContext'
import { isPropertyOwner } from '../utils/ownership'

export default function MyPropertiesPage() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [archivingId, setArchivingId] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    propertiesApi.allActive()
      .then(async (records) => {
        // Some list serializers omit seller, while detail serializers include it.
        const withSeller = await Promise.all(records.map(async (property) => {
          if (property.seller != null || property.seller_id != null) return property
          return propertiesApi.detail(property.id)
        }))
        if (active) setProperties(withSeller.filter((property) => isPropertyOwner(property, user)))
      })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, reload])

  async function archive(property) {
    if (archivingId != null) return
    if (!window.confirm(`Archive "${property.title}"? It will no longer appear in public listings.`)) return
    setError('')
    setArchivingId(property.id)
    try {
      await propertiesApi.archive(property.id)
      setProperties((current) => current.filter((item) => item.id !== property.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Listings</h1>
          <p className="mt-1 text-sm text-slate-600">Manage properties you have listed.</p>
        </div>
        <Link to="/properties/new" className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
          + List property
        </Link>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button type="button" className="ml-3 underline" onClick={() => setReload((x) => x + 1)}>Try again</button>
        </div>
      )}

      {loading ? <p className="text-sm text-slate-600">Loading your properties...</p> : properties.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-600">
          You have no active listings. <Link to="/properties/new" className="text-blue-700 underline">Create one</Link>.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <div key={property.id} className="space-y-2">
              <PropertyCard property={property} />
              <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-sm">
                <Link to={`/properties/${property.id}/edit`} className="text-blue-700 underline">Edit</Link>
                <Link to={`/properties/${property.id}/photos`} className="text-blue-700 underline">Manage photos</Link>
                <button type="button" disabled={archivingId != null} onClick={() => archive(property)}
                  className="text-red-700 underline disabled:opacity-50">
                  {archivingId === property.id ? 'Archiving...' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-5 text-xs text-slate-500">Only active listings are shown. Archiving hides a listing; it does not permanently delete it.</p>
    </div>
  )
}
