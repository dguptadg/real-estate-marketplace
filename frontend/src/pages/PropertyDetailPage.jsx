import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { propertiesApi } from '../api/properties'
import { messagingApi } from '../api/messaging'
import AuthenticatedPropertyImage from '../components/AuthenticatedPropertyImage'
import { useAuth } from '../context/AuthContext'
import { isPropertyOwner } from '../utils/ownership'

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value == null ? 'Price not listed' : `₹${value}`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(number)
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="border-b border-slate-100 py-2 sm:grid sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}

export default function PropertyDetailPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contactError, setContactError] = useState('')
  const [contacting, setContacting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setProperty(null)

    propertiesApi.detail(propertyId)
      .then((data) => {
        if (!cancelled) setProperty(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [propertyId])

  async function contactSeller() {
    if (!property || contacting || isPropertyOwner(property, user)) return
    setContacting(true)
    setContactError('')
    try {
      // Django reuses the same conversation for this buyer and property.
      const conversation = await messagingApi.startConversation(property.id)
      navigate(`/messages/${conversation.id}`)
    } catch (err) {
      setContactError(err.message)
    } finally {
      setContacting(false)
    }
  }

  const images = Array.isArray(property?.images)
    ? property.images.filter((image) => image?.id != null)
    : []

  return (
    <div>
      <Link to="/properties" className="mb-5 inline-block text-sm text-blue-700 hover:underline">
        ← Back to properties
      </Link>

      {loading ? (
        <p className="text-sm text-slate-600">Loading property details...</p>
      ) : error ? (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : !property ? (
        <p className="text-sm text-slate-600">Property not found.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{property.title}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {[property.city, property.state].filter(Boolean).join(', ') || 'Location not listed'}
              </p>
            </div>
            <span className="rounded border border-slate-200 bg-white px-3 py-1 text-sm">
              {property.listing_type === 'rent' ? 'For rent' : 'For sale'}
            </span>
          </div>

          {isPropertyOwner(property, user) && (
            <div className="mb-4 flex gap-4 text-sm">
              <Link to={`/properties/${property.id}/edit`} className="text-blue-700 underline">Edit listing</Link>
              <Link to={`/properties/${property.id}/photos`} className="text-blue-700 underline">Manage photos</Link>
            </div>
          )}

          <p className="mb-5 text-xl font-semibold text-blue-700">
            {formatPrice(property.price)}
            {property.listing_type === 'rent' && property.rent_period && (
              <span className="text-sm font-normal text-slate-600"> / {property.rent_period === 'monthly' ? 'month' : property.rent_period === 'yearly' ? 'year' : property.rent_period}</span>
            )}
          </p>

          {!isPropertyOwner(property, user) && (
            <div className="mb-5">
              <button
                type="button"
                onClick={contactSeller}
                disabled={contacting}
                className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {contacting ? 'Opening chat...' : 'Contact Seller'}
              </button>
              {contactError && (
                <p role="alert" className="mt-2 text-sm text-red-700">{contactError}</p>
              )}
            </div>
          )}

          <section className="mb-6 rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Photos</h2>
            {images.length === 0 ? (
              <p className="text-sm text-slate-500">No photos uploaded for this property.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((image, index) => (
                  <AuthenticatedPropertyImage
                    key={image.id}
                    propertyId={property.id}
                    imageId={image.id}
                    alt={`${property.title} - photo ${index + 1}`}
                    className="h-56 w-full rounded border border-slate-200 object-cover"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-6 rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Property information</h2>
            <dl>
              <DetailRow label="Type" value={titleCase(property.property_type)} />
              <DetailRow label="Listing" value={property.listing_type === 'rent' ? 'Rent' : 'Sale'} />
              <DetailRow label="Bedrooms" value={property.bedrooms} />
              <DetailRow label="Bathrooms" value={property.bathrooms} />
              <DetailRow label="Area" value={property.area_sqft != null ? `${property.area_sqft} sq ft` : null} />
              <DetailRow label="Address" value={property.address} />
              <DetailRow label="City" value={property.city} />
              <DetailRow label="State" value={property.state} />
              <DetailRow label="Seller" value={typeof property.seller === 'object' ? (property.seller?.username || property.seller?.id) : (property.seller != null ? `User #${property.seller}` : null)} />
            </dl>
          </section>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {property.description || 'No description provided.'}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
