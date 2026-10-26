import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import TextInput from '../components/TextInput'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <p className="p-8 text-center text-sm">Loading...</p>
  if (user) return <Navigate to="/" replace />

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Property Marketplace</h1>
      <p className="mb-6 text-sm text-slate-600">Create a new account to get started.</p>

      <div className="rounded border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold">Register</h2>
        {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <TextInput label="Username" id="reg-username" value={form.username}
            onChange={change('username')} required autoComplete="username" />
          <TextInput label="Email" id="reg-email" type="email" value={form.email}
            onChange={change('email')} required autoComplete="email" />
          <TextInput label="Password" id="reg-password" type="password" value={form.password}
            onChange={change('password')} required minLength={8} autoComplete="new-password" />
          <TextInput label="Confirm password" id="reg-confirm" type="password" value={form.confirm}
            onChange={change('confirm')} required minLength={8} autoComplete="new-password" />
          <button type="submit" disabled={saving}
            className="w-full rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          Already registered? <Link className="text-blue-700 underline" to="/login">Login</Link>
        </p>
      </div>
    </main>
  )
}
