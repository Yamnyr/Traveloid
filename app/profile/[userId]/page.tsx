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
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/map">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <span className="font-bold text-xl text-primary">Profile</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
              <User className="h-4 w-4" />
              <span>{currentUserProfile?.display_name || currentUser.email}</span>
            </div>
            <form action="/auth/sign-out" method="post">
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

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

