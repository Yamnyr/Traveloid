import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PolaroidGallery } from "@/components/gallery/polaroid-gallery"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LogOut, User } from "lucide-react"
import Link from "next/link"

export default async function GalleryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's pins with photos
  const { data: pins } = await supabase
    .from("travel_pins")
    .select(`
      *,
      pin_photos (*)
    `)
    .eq("user_id", user.id)
    .order("visit_date", { ascending: false })

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

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
            <span className="font-bold text-xl text-primary">Photo Gallery</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
              <User className="h-4 w-4" />
              <span>{profile?.display_name || user.email}</span>
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

      <main className="flex-1 container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Your Travel Memories</h1>
          <p className="text-muted-foreground">A collection of moments from your journey</p>
        </div>

        <PolaroidGallery pins={pins || []} />
      </main>
    </div>
  )
}
