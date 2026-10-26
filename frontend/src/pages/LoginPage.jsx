import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TextInput from '../components/TextInput'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <p className="p-8 text-center text-sm">Loading...</p>
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">Property Marketplace</h1>
      <p className="mb-6 text-sm text-slate-600">Login to browse properties and contact sellers.</p>

      <div className="rounded border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold">Login</h2>
        {location.state?.registered && (
          <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">
            Account created. You can now log in.
          </p>
        )}
        {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <form onSubmit={onSubmit} className="space-y-4">
          <TextInput label="Username" id="username" value={username}
            onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
          <TextInput label="Password" id="password" type="password" value={password}
            onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          <button type="submit" disabled={saving}
            className="w-full rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          Don't have an account? <Link className="text-blue-700 underline" to="/register">Register</Link>
        </p>
      </div>
    </main>
  )
}
