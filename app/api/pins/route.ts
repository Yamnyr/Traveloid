import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { sql } from "@/lib/db"
import { deletePhotoFile } from "@/lib/storage"

// POST: Create a new travel pin
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { latitude, longitude, locationName, visitDate, notes } = await request.json()

    if (latitude === undefined || longitude === undefined || !locationName) {
      return NextResponse.json({ error: "Latitude, longitude and location name are required" }, { status: 400 })
    }

    const newPins = await sql`
      INSERT INTO public.travel_pins (user_id, latitude, longitude, location_name, visit_date, notes)
      VALUES (${userId}, ${latitude}, ${longitude}, ${locationName}, ${visitDate || null}, ${notes || null})
      RETURNING id, user_id, latitude, longitude, location_name, visit_date, notes, created_at
    `

    return NextResponse.json(newPins[0])
  } catch (error) {
    console.error("Error creating pin in Neon:", error)
    return NextResponse.json({ error: "Failed to create pin" }, { status: 500 })
  }
}

// PUT: Update an existing travel pin
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { pinId, locationName, visitDate, notes } = await request.json()

    if (!pinId || !locationName) {
      return NextResponse.json({ error: "Pin ID and location name are required" }, { status: 400 })
    }

    // Verify ownership and update
    const updatedPins = await sql`
      UPDATE public.travel_pins
      SET location_name = ${locationName}, visit_date = ${visitDate || null}, notes = ${notes || null}, updated_at = NOW()
      WHERE id = ${pinId} AND user_id = ${userId}
      RETURNING id, location_name, visit_date, notes
    `

    if (updatedPins.length === 0) {
      return NextResponse.json({ error: "Pin not found or unauthorized to edit" }, { status: 404 })
    }

    return NextResponse.json(updatedPins[0])
  } catch (error) {
    console.error("Error updating pin in Neon:", error)
    return NextResponse.json({ error: "Failed to update pin" }, { status: 500 })
  }
}

// DELETE: Delete a travel pin and its associated photos (including Vercel Blob)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.userId

    const { searchParams } = new URL(request.url)
    const pinId = searchParams.get("pinId")

    if (!pinId) {
      return NextResponse.json({ error: "Pin ID is required" }, { status: 400 })
    }

    // 1. Check pin ownership
    const pins = await sql`
      SELECT id FROM public.travel_pins WHERE id = ${pinId} AND user_id = ${userId}
    `
    if (pins.length === 0) {
      return NextResponse.json({ error: "Pin not found or unauthorized to delete" }, { status: 404 })
    }

    // 2. Fetch all photos associated with this pin to delete them from Vercel Blob
    const photos = await sql`
      SELECT photo_url FROM public.pin_photos WHERE pin_id = ${pinId}
    `

    // Delete photos from storage (handles both local uploads and Vercel Blobs)
    if (photos && photos.length > 0) {
      await Promise.all(
        photos.map(async (photo) => {
          try {
            await deletePhotoFile(photo.photo_url)
          } catch (err) {
            console.error(`Failed to delete photo file: ${photo.photo_url}`, err)
          }
        })
      )
    }

    // 3. Delete from Neon (cascade will handle public.pin_photos and public.pin_likes deletion)
    await sql`
      DELETE FROM public.travel_pins WHERE id = ${pinId} AND user_id = ${userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting pin in Neon:", error)
    return NextResponse.json({ error: "Failed to delete pin" }, { status: 500 })
  }
}
