import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function PageLayout() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </>
  )
}
