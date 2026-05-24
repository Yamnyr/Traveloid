"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Globe, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in")
      }

      router.push("/map")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 animated-bg-gradient relative selection:bg-primary/20">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Decorative background blobs */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/5 space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex h-12 w-12 rounded-2xl bg-primary items-center justify-center text-primary-foreground shadow-lg glow-primary mx-auto mb-2 hover:scale-105 active:scale-95 transition-all">
              <Globe className="h-6 w-6" />
            </Link>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground font-['Plus_Jakarta_Sans']">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to resume pinning your wanderlust memories.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-border/80 bg-background/50 focus-visible:ring-primary shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-border/80 bg-background/50 focus-visible:ring-primary shadow-xs"
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive dark:text-red-400 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:scale-[1.02] active:scale-98 transition-all duration-200 glow-primary flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Form Footer */}
          <div className="pt-4 border-t border-border/20 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link 
              href="/auth/sign-up" 
              className="font-bold text-primary hover:underline transition-all"
            >
              Sign up
            </Link>
          </div>

        </div>
      </motion.div>
    </div>
  )
}
