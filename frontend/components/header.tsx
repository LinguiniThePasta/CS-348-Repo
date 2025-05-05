"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export function Header() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="font-bold text-xl">
          Recipe App
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}

