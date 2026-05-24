import { getSessionUser } from "@/lib/session"
import { redirect } from "next/navigation"
import MapWrapper from "@/components/map/map-wrapper"
import { LogOut, User } from "lucide-react"
import Link from "next/link"
import { sql, getOrCreateProfile } from "@/lib/db"

export default async function MapPage() {
  const session = await getSessionUser()

  if (!session) {
    redirect("/auth/login")
  }

  // Create a compatible user object for UI components expecting Supabase user format
  const user = {
    id: session.userId,
    email: session.email,
    user_metadata: {
      display_name: session.displayName || session.email.split("@")[0]
    }
  }

  // Lazily sync the logged-in user's profile to the Neon database
  const profileName = user.user_metadata.display_name
  await getOrCreateProfile(user.id, user.email, profileName)

  // Fetch all pins from Neon, including aggregate photos and likes in a single query
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
      FROM public.travel_pins tp
      LEFT JOIN public.profiles p ON p.id = tp.user_id
      ORDER BY tp.created_at DESC
    `
  } catch (error) {
    console.error("Error fetching pins from Neon:", error)
  }

  console.log("[v0] Fetched pins from Neon:", pins?.length || 0, "pins")

  // Process pins to add social metadata
  const processedPins = pins?.map((pin) => ({
    ...pin,
    author_name: pin.author_name || "Unknown Traveler",
    author_id: pin.user_id,
    is_mine: pin.user_id === user.id,
    likes_count: pin.pin_likes?.length || 0,
    is_liked: pin.pin_likes?.some((like: any) => like.user_id === user.id) || false,
  }))

  console.log("[v0] Processed pins:", processedPins?.length || 0)

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main className="flex-1 relative h-full w-full">
        <MapWrapper pins={processedPins || []} currentUser={user} />
      </main>
    </div>
  )
}
