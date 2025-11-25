"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  pin_likes?: { user_id: string }[]
}

interface Profile {
  id: string
  display_name: string | null
  created_at: string
}

interface ProfileContentProps {
  profile: Profile
  pins: Pin[]
  isOwnProfile: boolean
  isFollowing: boolean
  followersCount: number
  followingCount: number
}

export function ProfileContent({
  profile,
  pins,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  followersCount: initialFollowersCount,
  followingCount,
}: ProfileContentProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
      toast.success(data.following ? "You are now following this user" : "You unfollowed this user")
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

  return (
    <div className="space-y-8">
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      {/* Profile Header */}
      <div className="text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mx-auto flex items-center justify-center text-white text-3xl font-bold">
          {(profile.display_name || "User")[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{profile.display_name || "Traveler"}</h1>
          <p className="text-muted-foreground">Member since {format(new Date(profile.created_at), "MMMM yyyy")}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{pins.length}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{followersCount}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{followingCount}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnProfile && (
          <Button onClick={handleFollowToggle} disabled={isLoading} className="mt-4">
            {isFollowing ? "Unfollow" : "Follow"}
          </Button>
        )}
      </div>

      {/* Posts Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Travel Memories</h2>
        {pins.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No travel memories yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 p-4">
            {pins.map((pin, index) => {
              const hasPhoto = pin.pin_photos && pin.pin_photos.length > 0
              const photo = hasPhoto ? pin.pin_photos[0] : null
              const likesCount = pin.pin_likes?.length || 0
              // Generate consistent rotation based on pin ID
              const hash = pin.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
              const rotation = ((hash % 6) - 3) // Rotation between -3 and 3 degrees, consistent per pin

              return (
                <motion.div
                  key={pin.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                  className="relative cursor-pointer group"
                  style={{ rotate: rotation }}
                >
                  <div className="bg-white p-4 pb-12 shadow-lg transition-shadow hover:shadow-xl">
                    {/* Photo */}
                    {photo ? (
                      <div className="aspect-square overflow-hidden bg-gray-100 mb-4">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || pin.location_name || "Travel memory"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 mb-4 flex items-center justify-center">
                        <MapPin className="h-12 w-12 text-white opacity-50" />
                      </div>
                    )}

                    {/* Caption - Polaroid style */}
                    <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                      <p 
                        className="text-lg text-gray-800 truncate mb-1"
                        style={{ fontFamily: "'Caveat', cursive" }}
                      >
                        {photo?.caption || pin.location_name || "Travel Memory"}
                      </p>
                      <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                        {pin.visit_date && (
                          <span>{format(new Date(pin.visit_date), "MMM yyyy")}</span>
                        )}
                        {likesCount > 0 && (
                          <>
                            <span>•</span>
                            <span>❤️ {likesCount}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* View on Map Button - Modern style */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shadow-md backdrop-blur-sm bg-white/90 hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleGoToMap(pin)
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-1.5" />
                        <span className="text-xs">View</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

