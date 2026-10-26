import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PropertyCard from '../components/PropertyCard'
import { propertiesApi } from '../api/properties'

const filterFields = [
  'search', 'city', 'listing_type', 'property_type', 'min_price', 'max_price', 'ordering',
]

const inputClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm'

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const [properties, setProperties] = useState([])
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    propertiesApi.list(new URLSearchParams(queryString))
      .then((response) => {
        if (cancelled) return
        const results = Array.isArray(response) ? response : response?.results
        if (!Array.isArray(results)) {
          throw new Error('Unexpected property list response from Django.')
        }
        setProperties(results)
        setCount(Array.isArray(response) ? results.length : response.count ?? results.length)
        setHasNext(Boolean(response?.next))
        setHasPrevious(Boolean(response?.previous))
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setProperties([])
          setCount(0)
          setHasNext(false)
          setHasPrevious(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [queryString])

  function applyFilters(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const next = new URLSearchParams()
    for (const field of filterFields) {
      const value = String(formData.get(field) || '').trim()
      if (value) next.set(field, value)
    }
    // New searches start at the first page.
    setSearchParams(next)
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Browse Properties</h1>
      <p className="mb-5 text-sm text-slate-600">Search properties listed by other members and sellers.</p>

      <form key={queryString} onSubmit={applyFilters}
        className="mb-6 rounded border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block">Search</span>
            <input className={inputClass} name="search" type="search" placeholder="Title, address, location"
              defaultValue={searchParams.get('search') || ''} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">City</span>
            <input className={inputClass} name="city" placeholder="City"
              defaultValue={searchParams.get('city') || ''} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Listing</span>
            <select className={inputClass} name="listing_type" defaultValue={searchParams.get('listing_type') || ''}>
              <option value="">Sale or rent</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Property type</span>
            <select className={inputClass} name="property_type" defaultValue={searchParams.get('property_type') || ''}>
              <option value="">All types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Minimum price (₹)</span>
            <input className={inputClass} name="min_price" type="number" min="0" step="1"
              defaultValue={searchParams.get('min_price') || ''} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Maximum price (₹)</span>
            <input className={inputClass} name="max_price" type="number" min="0" step="1"
              defaultValue={searchParams.get('max_price') || ''} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Sort by</span>
            <select className={inputClass} name="ordering" defaultValue={searchParams.get('ordering') || '-created_at'}>
              <option value="-created_at">Newest first</option>
              <option value="created_at">Oldest first</option>
              <option value="price">Price: low to high</option>
              <option value="-price">Price: high to low</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800" type="submit">Search properties</button>
          <button type="button" onClick={() => setSearchParams({})}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Clear filters</button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-slate-600">Loading properties...</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">{count} propert{count === 1 ? 'y' : 'ies'} found</p>
          {properties.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No matching properties. Try changing your filters.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
          )}
          {(hasPrevious || hasNext) && (
            <div className="mt-5 flex items-center gap-3">
              <button type="button" disabled={!hasPrevious} onClick={() => changePage(page - 1)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <span className="text-sm text-slate-600">Page {page}</span>
              <button type="button" disabled={!hasNext} onClick={() => changePage(page + 1)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
