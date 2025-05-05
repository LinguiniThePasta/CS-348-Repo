"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token")
    if (storedToken) {
      setToken(storedToken)
      setIsAuthenticated(true)
    }
  }, [])

  const login = (newToken: string) => {
    localStorage.setItem("auth_token", newToken)
    setToken(newToken)
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    setToken(null)
    setIsAuthenticated(false)
  }

  return <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>{children}</AuthContext.Provider>
}

