import { getSessionUser } from "@/lib/session"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const followerId = session.userId

    const { userId: followingId } = await request.json()

    if (!followingId || followingId === followerId) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // 1. Check if already following
    const existingFollows = await sql`
      SELECT id FROM public.follows 
      WHERE follower_id = ${followerId} AND following_id = ${followingId}
    `

    if (existingFollows && existingFollows.length > 0) {
      // Unfollow
      await sql`
        DELETE FROM public.follows 
        WHERE follower_id = ${followerId} AND following_id = ${followingId}
      `
      return NextResponse.json({ following: false })
    } else {
      // Follow
      await sql`
        INSERT INTO public.follows (follower_id, following_id) 
        VALUES (${followerId}, ${followingId})
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `
      return NextResponse.json({ following: true })
    }
  } catch (error) {
    console.error("Error toggling follow in Neon:", error)
    return NextResponse.json({ error: "Failed to toggle follow" }, { status: 500 })
  }
}
