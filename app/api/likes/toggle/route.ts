import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { pinId } = await request.json()

    if (!pinId) {
      return NextResponse.json({ error: "Pin ID required" }, { status: 400 })
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("pin_likes")
      .select("id")
      .eq("pin_id", pinId)
      .eq("user_id", user.id)
      .single()

    if (existingLike) {
      // Unlike
      const { error } = await supabase.from("pin_likes").delete().eq("pin_id", pinId).eq("user_id", user.id)

      if (error) throw error

      return NextResponse.json({ liked: false })
    } else {
      // Like
      const { error } = await supabase.from("pin_likes").insert({ pin_id: pinId, user_id: user.id })

      if (error) throw error

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("Error toggling like:", error)
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
