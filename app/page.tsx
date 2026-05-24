"use client"

import { Button } from "@/components/ui/button"
import { MapPin, Camera, Globe, Heart, Compass, Sparkles, Navigation } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const MOCK_MEMORIES = [
  {
    id: "1",
    location: "Kyoto, Japan",
    date: "April 2024",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&auto=format&fit=crop&q=60",
    rotation: -6,
    delay: 0.1,
  },
  {
    id: "2",
    location: "Paris, France",
    date: "June 2024",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&auto=format&fit=crop&q=60",
    rotation: 4,
    delay: 0.3,
  },
  {
    id: "3",
    location: "Reykjavík, Iceland",
    date: "Dec 2024",
    image: "https://images.unsplash.com/photo-1504893524553-ac55fce698be?w=500&auto=format&fit=crop&q=60",
    rotation: -2,
    delay: 0.5,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col animated-bg-gradient overflow-hidden relative selection:bg-primary/20">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Decorative blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-rose-400/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/20 glass-panel">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg glow-primary">
              <Globe className="h-5 w-5 animate-pulse" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              TravelMap
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex gap-3"
          >
            <Button variant="ghost" asChild className="rounded-xl hover:bg-secondary/40 font-semibold transition-all">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="rounded-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all glow-primary font-semibold">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20 relative z-10">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center max-w-7xl">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, cubicBezier: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wide uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Preserve Your Wanderlust
              </div>
              <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] font-['Plus_Jakarta_Sans']">
                Map Your{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-rose-600 bg-clip-text text-transparent">
                  Travel Memories
                </span>
              </h1>
              <p className="text-pretty text-base sm:text-lg text-muted-foreground leading-relaxed">
                Pin your global adventures on an interactive canvas and save your favorite memories as nostalgic, customizable Polaroid photos. Relive the journey, one click at a time.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" asChild className="rounded-2xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all text-base px-8 h-14 glow-primary font-bold">
                <Link href="/auth/sign-up">
                  <Compass className="mr-2 h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
                  Start Your Journey
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-2xl border-border/80 hover:bg-secondary/40 text-base px-8 h-14 font-semibold transition-all">
                <Link href="/auth/login">
                  <Navigation className="mr-2 h-5 w-5 rotate-45" />
                  Explore the Demo
                </Link>
              </Button>
            </motion.div>

            {/* Features Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="grid gap-6 sm:grid-cols-3 pt-6"
            >
              <div className="flex gap-3.5 items-start p-4 rounded-2xl hover:bg-card/40 transition-colors border border-transparent hover:border-border/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MapPin className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Pin Locations</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Mark your steps on a customizable global map.</p>
                </div>
              </div>
              <div className="flex gap-3.5 items-start p-4 rounded-2xl hover:bg-card/40 transition-colors border border-transparent hover:border-border/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Camera className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Polaroid Prints</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Upload snapshots with beautiful handwriting text.</p>
                </div>
              </div>
              <div className="flex gap-3.5 items-start p-4 rounded-2xl hover:bg-card/40 transition-colors border border-transparent hover:border-border/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Heart className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Share & Follow</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">Explore feeds and exchange traveler likes.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Floating Polaroid Showcase */}
          <div className="lg:col-span-5 h-[400px] sm:h-[480px] w-full relative flex items-center justify-center lg:pl-8">
            {MOCK_MEMORIES.map((memory) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, scale: 0.8, rotate: memory.rotation * 2, y: 50 }}
                animate={{ opacity: 1, scale: 1, rotate: memory.rotation, y: 0 }}
                transition={{ 
                  delay: memory.delay, 
                  duration: 0.8, 
                  type: "spring",
                  stiffness: 70 
                }}
                whileHover={{ 
                  scale: 1.1, 
                  rotate: 0, 
                  zIndex: 40,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                }}
                style={{ originX: 0.5, originY: 0.5 }}
                className="absolute w-[200px] sm:w-[240px] bg-white p-3 pb-8 shadow-xl border border-gray-100 rounded-sm cursor-pointer select-none"
              >
                <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden relative rounded-xs">
                  <img
                    src={memory.image}
                    alt={memory.location}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/5" />
                </div>
                <div className="text-center pt-4 px-1">
                  <h3 className="font-bold text-lg text-gray-800 tracking-wide font-['Caveat'] truncate">
                    {memory.location}
                  </h3>
                  <p className="text-xs text-gray-500 font-['Caveat'] font-medium mt-0.5">
                    {memory.date}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border/10 text-center text-xs text-muted-foreground/60 z-10 bg-background/20 backdrop-blur-xs">
        <p>© {new Date().getFullYear()} TravelMap. Redesigned with premium interactions.</p>
      </footer>
    </div>
  )
}
