import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading, startupError, retry } = useAuth()

  if (loading) return <p className="p-8 text-center text-sm">Loading...</p>
  if (startupError) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-xl font-semibold">Unable to load your account</h1>
        <p role="alert" className="mb-4 text-sm text-red-700">{startupError}</p>
        <button onClick={retry} className="rounded bg-blue-700 px-4 py-2 text-sm text-white">Retry</button>
      </main>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
