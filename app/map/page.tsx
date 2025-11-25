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
        <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/40 z-10">
          <div className="container flex h-16 items-center justify-between px-4">

            {/* Logo / Brand */}
            <Link href="/"
                  className="flex items-center gap-2 font-semibold text-xl text-primary hover:opacity-80 transition">
              <span>Traveloid</span>
            </Link>

            <div className="flex items-center gap-4">

              {/* Profil clicable complet */}
              <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent hover:text-accent-foreground transition"
              >
                <User className="h-5 w-5 opacity-80"/>
                <span className="text-sm font-medium">
          {profile?.display_name || user.email}
        </span>
              </Link>

              {/* Sign out */}
              <form action="/auth/sign-out" method="post">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-xl hover:bg-accent hover:text-accent-foreground transition"
                >
                  <LogOut className="h-4 w-4"/>
                  Sign Out
                </Button>
              </form>

            </div>
          </div>
        </header>


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
