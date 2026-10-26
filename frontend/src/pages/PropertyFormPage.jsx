import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { propertiesApi } from '../api/properties'
import { useAuth } from '../context/AuthContext'
import { isPropertyOwner } from '../utils/ownership'

const inputClass = 'mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none'

const emptyValues = {
  title: '', description: '', listing_type: 'sale', property_type: 'apartment',
  price: '', rent_period: 'monthly', address: '', city: '', state: '',
  bedrooms: '0', bathrooms: '0', area_sqft: '',
}

const editableFields = [
  'title', 'description', 'listing_type', 'property_type', 'price',
  'address', 'city', 'state', 'bedrooms', 'bathrooms', 'area_sqft',
]

function FormField({ name, label, children, ...rest }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children || <input name={name} id={name} className={inputClass} {...rest} />}
    </label>
  )
}

export default function PropertyFormPage({ editing = false }) {
  const { propertyId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState(emptyValues)
  const [loading, setLoading] = useState(editing)
  const [authorized, setAuthorized] = useState(!editing)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    let active = true
    setLoading(true)
    propertiesApi.detail(propertyId)
      .then((property) => {
        if (!active) return
        if (!isPropertyOwner(property, user)) {
          setError('Only the property owner can edit this listing.')
          setAuthorized(false)
          return
        }
        setAuthorized(true)
        setValues(Object.fromEntries(
          Object.keys(emptyValues).map((key) => [key, String(property[key] ?? emptyValues[key])])
        ))
      })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, propertyId, user])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (saving || !authorized) return
    setError('')
    setSaving(true)

    const data = Object.fromEntries(editableFields.map((field) => [field, values[field].trim()]))
    if (values.listing_type === 'rent') data.rent_period = values.rent_period

    try {
      if (editing) {
        await propertiesApi.update(propertyId, data)
        navigate(`/properties/${propertyId}`)
      } else {
        const property = await propertiesApi.create(data)
        navigate(`/properties/${property.id}/photos`, { state: { justCreated: true } })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-600">Loading property...</p>
  if (editing && !authorized) return <p role="alert" className="text-sm text-red-700">{error}</p>

  return (
    <div className="max-w-3xl">
      <Link to="/my-properties" className="text-sm text-blue-700 hover:underline">← My listings</Link>
      <h1 className="mb-2 mt-4 text-2xl font-semibold">{editing ? 'Edit property' : 'List a property'}</h1>
      <p className="mb-5 text-sm text-slate-600">
        {editing ? 'Update the property information below.' : 'Enter the details of the property you want to list.'}
      </p>

      <form onSubmit={submit} className="space-y-4 rounded border border-slate-200 bg-white p-5">
        <FormField name="title" label="Property title" required maxLength={200} value={values.title} onChange={handleChange} />
        <FormField name="description" label="Description">
          <textarea name="description" id="description" rows={4} required className={inputClass}
            value={values.description} onChange={handleChange} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="listing_type" label="Listing type">
            <select name="listing_type" className={inputClass} value={values.listing_type} onChange={handleChange}>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
            </select>
          </FormField>
          <FormField name="property_type" label="Property type">
            <select name="property_type" className={inputClass} value={values.property_type} onChange={handleChange}>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="commercial">Commercial</option>
            </select>
          </FormField>
          <FormField name="price" label="Price (₹)" type="number" min="0.01" step="0.01" required
            value={values.price} onChange={handleChange} />
          {values.listing_type === 'rent' && (
            <FormField name="rent_period" label="Rent period">
              <select name="rent_period" className={inputClass} value={values.rent_period} onChange={handleChange}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </FormField>
          )}
        </div>

        <FormField name="address" label="Address" required value={values.address} onChange={handleChange} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="city" label="City" required value={values.city} onChange={handleChange} />
          <FormField name="state" label="State" required value={values.state} onChange={handleChange} />
          <FormField name="bedrooms" label="Bedrooms" type="number" min="0" step="1" required
            value={values.bedrooms} onChange={handleChange} />
          <FormField name="bathrooms" label="Bathrooms" type="number" min="0" step="1" required
            value={values.bathrooms} onChange={handleChange} />
          <FormField name="area_sqft" label="Area (sq ft)" type="number" min="0.01" step="0.01" required
            value={values.area_sqft} onChange={handleChange} />
        </div>

        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={saving}
            className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            {saving ? 'Saving...' : (editing ? 'Save changes' : 'Create listing')}
          </button>
          <Link to="/my-properties" className="text-sm text-slate-600 hover:underline">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
