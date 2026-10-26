import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user } = useAuth()
  const displayName = user?.first_name?.trim() || user?.username

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Welcome, {displayName}</h1>
      <p className="mb-6 text-sm text-slate-600">You are logged in to Property Marketplace.</p>

      <div className="max-w-2xl rounded border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Your account</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[130px_1fr]">
          <dt className="text-slate-500">Username</dt><dd>{user?.username}</dd>
          <dt className="text-slate-500">Email</dt><dd>{user?.email}</dd>
        </dl>
        <Link to="/profile" className="mt-5 inline-block rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800">
          Edit profile
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link to="/properties" className="rounded border border-slate-300 bg-white px-4 py-2 text-blue-700 hover:bg-slate-50">Browse properties</Link>
        <Link to="/my-properties" className="rounded border border-slate-300 bg-white px-4 py-2 text-blue-700 hover:bg-slate-50">My listings</Link>
        <Link to="/properties/new" className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">List a property</Link>
      </div>
    </div>
  )
}
