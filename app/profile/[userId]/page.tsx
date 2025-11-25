import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut, User, MapPin, Calendar } from "lucide-react"
import Link from "next/link"
import { ProfileContent } from "@/components/profile/profile-content"
import { format } from "date-fns"

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    redirect("/auth/login")
  }

  const { userId } = await params

  // Fetch profile user data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Fetch user's pins with photos
  const { data: pins } = await supabase
    .from("travel_pins")
    .select(`
      *,
      pin_photos (*),
      pin_likes (user_id)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  // Check if current user is following this profile
  const { data: followData } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", currentUser.id)
    .eq("following_id", userId)
    .single()

  const isFollowing = !!followData

  // Get follower and following counts
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId)

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId)

  // Fetch current user profile for header
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", currentUser.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Bulle Retour (gauche) */}
      <Link
          href="/map"
          className="
    absolute top-4 left-4 z-[1000]
    flex items-center justify-center
    w-14 h-14
    rounded-full
    bg-white/80 backdrop-blur
    shadow-lg
    border border-white/40
    hover:scale-105 active:scale-95
    transition
  "
      >
        <ArrowLeft className="h-6 w-6 text-primary" />
      </Link>

      {/* Bulle Profil (droite top) */}
      <div
          className="
    absolute top-4 right-4 z-[1000]
    hidden sm:flex items-center justify-center
    w-14 h-14
    rounded-full
    bg-white/80 backdrop-blur
    shadow-lg
    border border-white/40
    hover:scale-105 active:scale-95
    transition
  "
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <User className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Bulle Logout (droite sous le profil) */}
      <form action="/auth/sign-out" method="post">
        <button
            className="
      absolute top-[80px] right-4 z-[1000]
      flex items-center justify-center
      w-14 h-14
      rounded-full
      bg-white/80 backdrop-blur
      shadow-lg
      border border-white/40
      hover:scale-105 active:scale-95
      transition
    "
        >
          <LogOut className="h-6 w-6 text-primary" />
        </button>
      </form>


      <main className="flex-1 container mx-auto py-8 px-4">
        <ProfileContent
          profile={profile}
          pins={pins || []}
          isOwnProfile={userId === currentUser.id}
          isFollowing={isFollowing}
          followersCount={followersCount || 0}
          followingCount={followingCount || 0}
        />
      </main>
    </div>
  )
}

