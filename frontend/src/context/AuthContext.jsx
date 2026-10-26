import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, clearSession, hasSession, SESSION_CLEARED_EVENT } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    function onSessionCleared() {
      setUser(null)
      setStartupError('')
    }
    window.addEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
    return () => window.removeEventListener(SESSION_CLEARED_EVENT, onSessionCleared)
  }, [])

  useEffect(() => {
    let active = true

    async function loadUser() {
      setLoading(true)
      setStartupError('')
      if (!hasSession()) {
        if (active) { setUser(null); setLoading(false) }
        return
      }
      try {
        const profile = await authApi.profile()
        if (active && hasSession()) setUser(profile)
      } catch (error) {
        if (!hasSession()) {
          if (active) setUser(null)
        } else if (active) {
          setStartupError(error.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUser()
    return () => { active = false }
  }, [retryKey])

  async function login(username, password) {
    await authApi.login(username, password)
    try {
      const profile = await authApi.profile()
      setUser(profile)
    } catch (error) {
      clearSession()
      throw error
    }
  }

  function logout() {
    clearSession()
    setUser(null)
    setStartupError('')
  }

  async function updateProfile(data) {
    const profile = await authApi.updateProfile(data)
    setUser(profile)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, startupError, login, logout, updateProfile,
      retry: () => setRetryKey((number) => number + 1),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
