import { deletePhotoFile } from "@/lib/storage"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlToDelete = searchParams.get("url")

  if (!urlToDelete) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  const session = await getSessionUser()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await deletePhotoFile(urlToDelete)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
