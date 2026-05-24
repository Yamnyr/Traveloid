"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, Heart, Award, Compass, BarChart3, Activity } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

interface Photo {
  id: string
  photo_url: string
  caption: string | null
  created_at: string
}

interface Pin {
  id: string
  location_name: string | null
  visit_date: string | null
  notes: string | null
  latitude: number
  longitude: number
  created_at: string
  pin_photos: Photo[]
  likes_count?: number
  is_liked?: boolean
}

interface Profile {
  id: string
  display_name: string | null
  created_at: string
}

interface ProfileContentProps {
  profile: Profile
  pins: Pin[]
  likedPins: Pin[]
  isOwnProfile: boolean
  isFollowing: boolean
  followersCount: number
  followingCount: number
}

// Custom Client-Side Count Up component for stats
function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (end === 0) {
      setCount(0)
      return
    }
    const duration = 1000 // ms
    const range = end - start
    let current = start
    const increment = end > start ? 1 : -1
    const stepTime = Math.abs(Math.floor(duration / range))
    
    const timer = setInterval(() => {
      current += increment
      setCount(current)
      if (current === end) {
        clearInterval(timer)
      }
    }, Math.max(stepTime, 20))

    return () => clearInterval(timer)
  }, [value])

  return <span>{count}</span>
}

export function ProfileContent({
  profile,
  pins,
  likedPins,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  followersCount: initialFollowersCount,
  followingCount,
}: ProfileContentProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"memories" | "likes" | "analytics">("memories")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFollowToggle = async () => {
    if (isOwnProfile) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/follow/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      })

      if (!response.ok) throw new Error("Failed to toggle follow")

      const data = await response.json()
      setIsFollowing(data.following)
      setFollowersCount((prev) => (data.following ? prev + 1 : prev - 1))
      toast.success(data.following ? `Now following ${profile.display_name}` : `Unfollowed ${profile.display_name}`)
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("Failed to update follow status")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToMap = (pin: Pin) => {
    const url = `/map?lat=${pin.latitude}&lng=${pin.longitude}&pin=${pin.id}`
    router.push(url)
  }

  // Calculate analytics activity map
  const analyticsData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const activity: { [key: string]: number } = {}

    // Group pins by month
    pins.forEach((pin) => {
      if (pin.visit_date) {
        const date = new Date(pin.visit_date)
        const key = `${months[date.getMonth()]} ${date.getFullYear()}`
        activity[key] = (activity[key] || 0) + 1
      }
    })

    // Sort chronologically and shape for Recharts
    const chartData = Object.entries(activity).map(([name, count]) => ({
      name,
      pins: count,
    }))

    // Total photos
    const totalPhotos = pins.reduce((acc, pin) => acc + (pin.pin_photos?.length || 0), 0)

    return {
      chartData,
      totalPhotos,
      uniqueLocations: pins.length,
    }
  }, [pins])

  // Custom styling for Polaroid hover rotation
  const getRotationStyle = (id: string) => {
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const rotation = (hash % 6) - 3 // rot between -3deg and 3deg
    return { rotate: `${rotation}deg` }
  }

  const renderPinCard = (pin: Pin, index: number) => {
    const hasPhoto = pin.pin_photos && pin.pin_photos.length > 0
    const photo = hasPhoto ? pin.pin_photos[0] : null
    const likes = pin.likes_count !== undefined ? pin.likes_count : 0

    return (
      <motion.div
        key={pin.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: index * 0.08, type: "spring", stiffness: 90 }}
        whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
        className="relative cursor-pointer group"
      >
        <div 
          onClick={() => handleGoToMap(pin)}
          className="bg-white p-4 pb-12 shadow-md hover:shadow-2xl border border-gray-100 rounded-sm transition-all duration-300 transform select-none"
          style={getRotationStyle(pin.id)}
        >
          {/* Polaroid Image Box */}
          {photo ? (
            <div className="aspect-square overflow-hidden bg-stone-100 relative rounded-xs border border-gray-50">
              <img
                src={photo.photo_url}
                alt={photo.caption || pin.location_name || "Travel snapshot"}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-primary/10 to-ring/5 rounded-xs flex flex-col items-center justify-center text-primary/75">
              <Compass className="h-10 w-10 opacity-55 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-[10px] font-bold tracking-wider uppercase mt-2">No Photo</span>
            </div>
          )}

          {/* Polaroid handwriting caption */}
          <div className="absolute bottom-4 left-0 right-0 text-center px-4">
            <p className="text-xl text-gray-800 tracking-wide font-['Caveat'] font-bold truncate mb-0.5">
              {photo?.caption || pin.location_name || "Travel Memory"}
            </p>
            
            <div className="flex items-center justify-center gap-2.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {pin.visit_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(pin.visit_date), "MMM yyyy")}
                </span>
              )}
              {likes > 0 && (
                <span className="flex items-center gap-1 text-rose-500">
                  <Heart className="h-3 w-3 fill-rose-500 stroke-rose-500" />
                  {likes}
                </span>
              )}
            </div>
          </div>

          {/* Floating Map Pin view */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg backdrop-blur-md bg-white/95 text-xs font-bold rounded-lg px-2.5 py-1"
              onClick={(e) => {
                e.stopPropagation()
                handleGoToMap(pin)
              }}
            >
              <MapPin className="h-3.5 w-3.5 mr-1 text-primary" />
              View
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-8">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Profile Info Card Container */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-border/40 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:text-left text-center">
        
        {/* Glow backdrop circles */}
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-[-50%] left-[-10%] w-[300px] h-[300px] rounded-full bg-rose-500/10 blur-[90px] pointer-events-none" />

        {/* Profile Avatar Initial Circle */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-ring flex items-center justify-center text-primary-foreground text-4xl font-extrabold shadow-2xl shrink-0 glow-primary border-2 border-white/20">
          {(profile.display_name || "T")[0].toUpperCase()}
        </div>

        {/* Profile Details */}
        <div className="space-y-4 flex-1 min-w-0 w-full">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-['Plus_Jakarta_Sans']">
              {profile.display_name || "Traveler"}
            </h1>
            <p className="text-sm text-muted-foreground/80 font-medium mt-1">
              Member since {format(new Date(profile.created_at), "MMMM yyyy")}
            </p>
          </div>

          {/* Social followers counts & posts */}
          <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-8 flex-wrap">
            <div className="space-y-0.5">
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-['Plus_Jakarta_Sans']">
                {mounted ? <CountUp value={pins.length} /> : pins.length}
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Memories</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-['Plus_Jakarta_Sans']">
                {mounted ? <CountUp value={followersCount} /> : followersCount}
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Followers</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-extrabold text-foreground tracking-tight font-['Plus_Jakarta_Sans']">
                {mounted ? <CountUp value={followingCount} /> : followingCount}
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Following</div>
            </div>
          </div>
        </div>

        {/* Follow/Unfollow Button */}
        {!isOwnProfile && (
          <Button 
            onClick={handleFollowToggle} 
            disabled={isLoading} 
            className="md:self-center rounded-xl bg-primary text-primary-foreground font-bold hover:scale-105 active:scale-95 transition-all glow-primary px-6 h-11 w-full md:w-auto"
          >
            {isFollowing ? "Unfollow" : "Follow Explorer"}
          </Button>
        )}
      </div>

      {/* Tabs Selector Navigation Bar */}
      <div className="flex justify-center border-b border-border/40 pb-px w-full overflow-hidden">
        <div className="flex bg-secondary/30 p-1 rounded-xl sm:rounded-2xl border border-border/40 gap-0.5 sm:gap-1 max-w-full overflow-x-auto no-scrollbar whitespace-nowrap">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("memories")}
            className={`rounded-lg sm:rounded-xl px-2.5 sm:px-5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm h-9 sm:h-10 transition-all shrink-0 ${activeTab === "memories" ? "bg-card text-foreground shadow-sm border border-border/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Compass className="h-4 w-4 sm:h-4.5 sm:w-4.5 mr-1 sm:mr-1.5" />
            <span>Memories ({pins.length})</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("likes")}
            className={`rounded-lg sm:rounded-xl px-2.5 sm:px-5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm h-9 sm:h-10 transition-all shrink-0 ${activeTab === "likes" ? "bg-card text-foreground shadow-sm border border-border/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className="h-4 w-4 sm:h-4.5 sm:w-4.5 mr-1 sm:mr-1.5" />
            <span>Likes ({likedPins.length})</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg sm:rounded-xl px-2.5 sm:px-5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm h-9 sm:h-10 transition-all shrink-0 ${activeTab === "analytics" ? "bg-card text-foreground shadow-sm border border-border/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BarChart3 className="h-4 w-4 sm:h-4.5 sm:w-4.5 mr-1 sm:mr-1.5" />
            <span>Analytics</span>
          </Button>
        </div>
      </div>

      {/* Tabs Content Panels */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {activeTab === "memories" && (
            <motion.div
              key="memories-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {pins.length === 0 ? (
                <div className="text-center py-16 bg-secondary/10 rounded-3xl border border-dashed border-border/50 text-muted-foreground p-8">
                  <Compass className="h-10 w-10 mx-auto text-muted-foreground/45 mb-2" />
                  <h3 className="font-bold text-base text-foreground">No memories pinned yet</h3>
                  <p className="text-xs mt-1 text-muted-foreground/75">Create your first pin on the map to start your collection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 p-2">
                  {pins.map((pin, i) => renderPinCard(pin, i))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "likes" && (
            <motion.div
              key="likes-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {likedPins.length === 0 ? (
                <div className="text-center py-16 bg-secondary/10 rounded-3xl border border-dashed border-border/50 text-muted-foreground p-8">
                  <Heart className="h-10 w-10 mx-auto text-muted-foreground/45 mb-2" />
                  <h3 className="font-bold text-base text-foreground">No liked memories</h3>
                  <p className="text-xs mt-1 text-muted-foreground/75">Browse travelers' pins on the map and double press or click heart to like them.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 p-2">
                  {likedPins.map((pin, i) => renderPinCard(pin, i))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Analytics summary row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl border border-border/40 bg-card flex items-center gap-4 shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <MapPin className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Places Visited</h5>
                    <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">{analyticsData.uniqueLocations}</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border/40 bg-card flex items-center gap-4 shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Compass className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Photos Logged</h5>
                    <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">{analyticsData.totalPhotos}</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-border/40 bg-card flex items-center gap-4 shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                    <Activity className="h-5.5 w-5.5 shrink-0" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Travel Rank</h5>
                    <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5 flex items-center gap-1">
                      <Award className="h-5 w-5 text-amber-500 shrink-0" />
                      {pins.length > 10 ? "Global Nomad" : pins.length > 3 ? "Avid Voyager" : "Explorer Novice"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart container */}
              <div className="p-6 rounded-3xl border border-border/40 bg-card shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="font-extrabold text-sm tracking-tight text-foreground">Travel Frequency over time</h4>
                </div>
                
                {analyticsData.chartData.length === 0 ? (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground/60 text-xs font-semibold bg-secondary/5 rounded-2xl border border-dashed border-border/40 p-4">
                    Visit dates must be logged on your pins to show history charts.
                  </div>
                ) : (
                  <div className="h-[300px] w-full pt-4 pr-4">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.chartData}>
                          <defs>
                            <linearGradient id="colorPins" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                          <XAxis 
                            dataKey="name" 
                            stroke="var(--muted-foreground)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                          />
                          <YAxis 
                            stroke="var(--muted-foreground)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--popover)', 
                              borderColor: 'var(--border)', 
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: 'var(--foreground)'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="pins" 
                            stroke="var(--primary)" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#colorPins)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
