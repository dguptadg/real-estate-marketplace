import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import TextInput from '../components/TextInput'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await updateProfile({ first_name: firstName, last_name: lastName })
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold">My Profile</h1>
      <p className="mb-6 text-sm text-slate-600">View your account details and update your name.</p>

      <form onSubmit={onSubmit} className="space-y-4 rounded border border-slate-200 bg-white p-5">
        <TextInput id="username" label="Username" value={user?.username || ''} disabled />
        <TextInput id="email" label="Email" type="email" value={user?.email || ''} disabled />
        <TextInput id="first" label="First name" value={firstName}
          onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
        <TextInput id="last" label="Last name" value={lastName}
          onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" />
        {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-700">{success}</p>}
        <button disabled={saving} type="submit"
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
