import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { sql } from "@/lib/db"
import { deletePhotoFile } from "@/lib/storage"

// POST: Add a new photo record to Neon database
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { pinId, photoUrl, caption } = await request.json()

    if (!pinId || !photoUrl) {
      return NextResponse.json({ error: "Pin ID and Photo URL are required" }, { status: 400 })
    }

    // Verify user owns the pin they are adding a photo to
    const pins = await sql`
      SELECT id FROM public.travel_pins WHERE id = ${pinId} AND user_id = ${userId}
    `
    if (pins.length === 0) {
      return NextResponse.json({ error: "Pin not found or unauthorized" }, { status: 404 })
    }

    const newPhotos = await sql`
      INSERT INTO public.pin_photos (pin_id, user_id, photo_url, caption)
      VALUES (${pinId}, ${userId}, ${photoUrl}, ${caption || null})
      RETURNING id, pin_id, user_id, photo_url, caption, created_at
    `

    return NextResponse.json(newPhotos[0])
  } catch (error) {
    console.error("Error adding photo to Neon:", error)
    return NextResponse.json({ error: "Failed to add photo" }, { status: 500 })
  }
}

// DELETE: Delete a photo from both Vercel Blob and Neon database
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("photoId")
    const photoUrl = searchParams.get("photoUrl")

    if (!photoId || !photoUrl) {
      return NextResponse.json({ error: "Photo ID and URL are required" }, { status: 400 })
    }

    // Verify ownership of the photo in Neon
    const photos = await sql`
      SELECT id FROM public.pin_photos WHERE id = ${photoId} AND user_id = ${userId}
    `
    if (photos.length === 0) {
      return NextResponse.json({ error: "Photo not found or unauthorized to delete" }, { status: 404 })
    }

    // 1. Delete from storage (handles both local uploads and Vercel Blobs)
    try {
      await deletePhotoFile(photoUrl)
    } catch (err) {
      console.error(`Failed to delete storage file: ${photoUrl}`, err)
      // We continue to delete from database even if file deletion fails, to avoid locked UI
    }

    // 2. Delete from Neon database
    await sql`
      DELETE FROM public.pin_photos WHERE id = ${photoId} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting photo in Neon:", error)
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
  }
}
