import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import MapWrapper from "@/components/map/map-wrapper"
import { Button } from "@/components/ui/button"
import { LogOut, User, ImageIcon } from "lucide-react"
import Link from "next/link"

export default async function MapPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: pins, error } = await supabase
    .from("travel_pins")
    .select(`
      *,
      pin_photos (*),
      profiles (display_name),
      pin_likes (user_id)
    `)
    .order("created_at", { ascending: false })

  console.log("[v0] Fetched pins from database:", pins?.length || 0, "pins")
  console.log("[v0] Query error:", error)
  if (pins && pins.length > 0) {
    console.log("[v0] Sample pin:", pins[0])
  }

  // Process pins to add social metadata
  const processedPins = pins?.map((pin) => ({
    ...pin,
    author_name: pin.profiles?.display_name || "Unknown Traveler",
    author_id: pin.user_id,
    is_mine: pin.user_id === user.id,
    likes_count: pin.pin_likes?.length || 0,
    is_liked: pin.pin_likes?.some((like: any) => like.user_id === user.id) || false,
  }))

  console.log("[v0] Processed pins:", processedPins?.length || 0)

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

  return (
      <div className="flex min-h-screen flex-col">

        {/* Bulle Profil (en haut à droite) */}
        {/* Bulle Profil (en haut à droite) */}
        <Link
            href={`/profile/${user.id}`}
            className="
    absolute top-4 right-4 z-[1000]
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
          <User className="h-7 w-7 text-primary" />
        </Link>

        {/* Bulle Logout (en dessous du profil, espacée de 16px) */}
        <form action="/auth/sign-out" method="post">
          <button
              className="
      absolute top-[80px] right-4 z-[1000]   /* 80px = 56px + un petit espace */
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




        <main className="flex-1 relative">
          <MapWrapper pins={processedPins || []} currentUser={user}/>

          {/*<div className="absolute top-4 left-4 z-[1000] sm:hidden">*/}
          {/*  <Button variant="secondary" size="icon" className="shadow-md" asChild>*/}
          {/*    <Link href={`/profile/${user.id}`}>*/}
          {/*      <ImageIcon className="h-5 w-5"/>*/}
          {/*    </Link>*/}
          {/*  </Button>*/}
          {/*</div>*/}
        </main>
      </div>
  )
}
