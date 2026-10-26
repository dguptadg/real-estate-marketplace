import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    `text-sm hover:text-blue-700 ${isActive ? 'font-semibold text-blue-700' : 'text-slate-700'}`

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <NavLink to="/" className="text-lg font-bold text-slate-900">
          Property Marketplace
        </NavLink>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-5">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/properties" className={linkClass}>Properties</NavLink>
          <NavLink to="/my-properties" className={linkClass}>My Listings</NavLink>
          <NavLink to="/properties/new" className={linkClass}>List Property</NavLink>
          <NavLink to="/messages" className={linkClass}>Messages</NavLink>
          <NavLink to="/profile" className={linkClass}>Profile</NavLink>
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.username}</span>
          <button type="button" onClick={handleLogout}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
            Logout
          </button>
        </nav>
      </div>
    </header>
  )
}
