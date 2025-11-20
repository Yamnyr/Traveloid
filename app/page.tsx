import { Button } from "@/components/ui/button"
import { MapPin, Camera, Globe } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">TravelMap</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
              Map Your Travel Memories
            </h1>
            <p className="text-pretty text-lg text-muted-foreground sm:text-xl">
              Pin your adventures on an interactive world map and preserve your favorite moments with beautiful
              Polaroid-style photos.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">Start Your Journey</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>

          <div className="grid gap-8 pt-12 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Pin Locations</h3>
              <p className="text-sm text-muted-foreground">
                Mark every place you've visited on an interactive world map
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Add Photos</h3>
              <p className="text-sm text-muted-foreground">Upload photos with a nostalgic Polaroid aesthetic</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Relive Adventures</h3>
              <p className="text-sm text-muted-foreground">Browse your travel history and cherish your memories</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
