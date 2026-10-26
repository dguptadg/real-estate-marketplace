import { Link } from 'react-router-dom'
import AuthenticatedPropertyImage from './AuthenticatedPropertyImage'

const titleCase = (value) =>
  String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase())

function formatPrice(value) {
  const price = Number(value)
  if (!Number.isFinite(price)) return `₹${value ?? '—'}`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price)
}

export default function PropertyCard({ property }) {
  const isRent = property.listing_type === 'rent'

  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      {Array.isArray(property.images) && property.images.length > 0 && property.images[0]?.id != null ? (
        <div className="mb-3">
          <AuthenticatedPropertyImage propertyId={property.id} imageId={property.images[0].id} alt={property.title} className="h-40 w-full rounded border border-slate-200 object-cover" />
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{property.title}</h2>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {isRent ? 'For rent' : 'For sale'}
        </span>
      </div>
      <p className="mb-1 text-lg font-semibold text-blue-700">
        {formatPrice(property.price)}
        {isRent && property.rent_period ? (
          <span className="text-sm font-normal text-slate-600"> / {property.rent_period === 'monthly' ? 'month' : property.rent_period === 'yearly' ? 'year' : property.rent_period}</span>
        ) : null}
      </p>
      <p className="mb-3 text-sm text-slate-600">
        {[property.city, property.state].filter(Boolean).join(', ') || 'Location not listed'}
      </p>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
        <span>{titleCase(property.property_type)}</span>
        {property.bedrooms != null && <span>{property.bedrooms} bedroom(s)</span>}
        {property.bathrooms != null && <span>{property.bathrooms} bathroom(s)</span>}
        {property.area_sqft != null && <span>{property.area_sqft} sq ft</span>}
      </div>
      {property.description && (
        <p className="text-sm text-slate-600">
          {property.description.length > 170
            ? `${property.description.slice(0, 170).trimEnd()}…`
            : property.description}
        </p>
      )}
      <Link to={`/properties/${property.id}`} className="mt-4 inline-block text-sm font-medium text-blue-700 underline hover:text-blue-900">
        View details
      </Link>
    </article>
  )
}
