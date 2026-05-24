import { getSessionUser } from "@/lib/session"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, LogOut, User } from "lucide-react"
import Link from "next/link"
import { ProfileContent } from "@/components/profile/profile-content"
import { sql, getOrCreateProfile } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await getSessionUser()

  if (!session) {
    redirect("/auth/login")
  }

  const currentUser = {
    id: session.userId,
    email: session.email,
    user_metadata: {
      display_name: session.displayName || session.email.split("@")[0]
    }
  }

  const { userId } = await params

  // 1. If viewing own profile, lazily ensure it exists in Neon
  if (userId === currentUser.id) {
    const profileName = currentUser.user_metadata?.display_name || currentUser.email?.split("@")[0] || "Traveler"
    await getOrCreateProfile(currentUser.id, currentUser.email, profileName)
  }

  // 2. Fetch target profile data from Neon
  const profiles = await sql`
    SELECT id, display_name, created_at 
    FROM public.profiles 
    WHERE id = ${userId}
  `

  if (profiles.length === 0) {
    notFound()
  }
  const profile = profiles[0]

  // 3. Fetch user's pins with associated photos and likes from Neon
  let pins: any[] = []
  try {
    pins = await sql`
      SELECT 
        tp.id,
        tp.user_id,
        tp.latitude,
        tp.longitude,
        tp.location_name,
        tp.visit_date,
        tp.notes,
        tp.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', pp.id, 'photo_url', pp.photo_url, 'caption', pp.caption)) 
           FROM public.pin_photos pp 
           WHERE pp.pin_id = tp.id), 
          '[]'::json
        ) AS pin_photos,
        COALESCE(
          (SELECT json_agg(json_build_object('user_id', pl.user_id)) 
           FROM public.pin_likes pl 
           WHERE pl.pin_id = tp.id), 
          '[]'::json
        ) AS pin_likes
      FROM public.travel_pins tp
      WHERE tp.user_id = ${userId}
      ORDER BY tp.created_at DESC
    `
  } catch (error) {
    console.error("Error fetching profile pins from Neon:", error)
  }

  // 4. Fetch pins liked by this user
  let likedPins: any[] = []
  try {
    likedPins = await sql`
      SELECT 
        tp.id,
        tp.user_id,
        tp.latitude,
        tp.longitude,
        tp.location_name,
        tp.visit_date,
        tp.notes,
        tp.created_at,
        p.display_name AS author_name,
        COALESCE(
          (SELECT json_agg(json_build_object('id', pp.id, 'photo_url', pp.photo_url, 'caption', pp.caption)) 
           FROM public.pin_photos pp 
           WHERE pp.pin_id = tp.id), 
          '[]'::json
        ) AS pin_photos,
        COALESCE(
          (SELECT json_agg(json_build_object('user_id', pl.user_id)) 
           FROM public.pin_likes pl 
           WHERE pl.pin_id = tp.id), 
          '[]'::json
        ) AS pin_likes
      FROM public.pin_likes pl
      JOIN public.travel_pins tp ON pl.pin_id = tp.id
      LEFT JOIN public.profiles p ON p.id = tp.user_id
      WHERE pl.user_id = ${userId}
      ORDER BY pl.created_at DESC
    `
  } catch (error) {
    console.error("Error fetching liked pins from Neon:", error)
  }

  // Process pins to add social stats
  const processedLikedPins = likedPins?.map((pin) => ({
    ...pin,
    author_name: pin.author_name || "Unknown Traveler",
    author_id: pin.user_id,
    is_mine: pin.user_id === currentUser.id,
    likes_count: pin.pin_likes?.length || 0,
    is_liked: pin.pin_likes?.some((like: any) => like.user_id === currentUser.id) || false,
  }))

  // 5. Check if current user is following this profile in Neon
  let isFollowing = false
  try {
    const follows = await sql`
      SELECT id FROM public.follows 
      WHERE follower_id = ${currentUser.id} AND following_id = ${userId}
    `
    isFollowing = follows.length > 0
  } catch (error) {
    console.error("Error checking follow status in Neon:", error)
  }

  // 6. Get follower and following counts from Neon
  let followersCount = 0
  let followingCount = 0
  try {
    const followers = await sql`
      SELECT COUNT(*)::int AS count FROM public.follows WHERE following_id = ${userId}
    `
    const following = await sql`
      SELECT COUNT(*)::int AS count FROM public.follows WHERE follower_id = ${userId}
    `
    followersCount = followers[0]?.count || 0
    followingCount = following[0]?.count || 0
  } catch (error) {
    console.error("Error fetching follow counts from Neon:", error)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background/50 selection:bg-primary/20">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-[100] w-full border-b border-border/20 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/map"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 text-primary group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Map</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <form action="/auth/sign-out" method="post">
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="rounded-xl font-semibold text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center gap-1.5 h-9 px-3"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-16 px-4 max-w-5xl">
        <ProfileContent
          profile={profile}
          pins={pins || []}
          likedPins={processedLikedPins || []}
          isOwnProfile={userId === currentUser.id}
          isFollowing={isFollowing}
          followersCount={followersCount || 0}
          followingCount={followingCount || 0}
        />
      </main>
    </div>
  )
}
