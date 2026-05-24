import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { pinId } = await request.json()

    if (!pinId) {
      return NextResponse.json({ error: "Pin ID required" }, { status: 400 })
    }

    // 1. Check if already liked using Neon
    const existingLikes = await sql`
      SELECT id FROM public.pin_likes 
      WHERE pin_id = ${pinId} AND user_id = ${userId}
    `

    if (existingLikes && existingLikes.length > 0) {
      // Unlike
      await sql`
        DELETE FROM public.pin_likes 
        WHERE pin_id = ${pinId} AND user_id = ${userId}
      `
      return NextResponse.json({ liked: false })
    } else {
      // Like
      await sql`
        INSERT INTO public.pin_likes (pin_id, user_id) 
        VALUES (${pinId}, ${userId})
        ON CONFLICT (user_id, pin_id) DO NOTHING
      `
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error("Error toggling like in Neon:", error)
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 })
  }
}
