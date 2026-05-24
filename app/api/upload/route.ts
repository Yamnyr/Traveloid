import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import fs from "fs"
import path from "path"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 1. Check if Vercel Blob is configured (Token is present)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(file.name, file, {
        access: "public",
      })
      return NextResponse.json({ url: blob.url })
    }

    // 2. Fallback to Local Filesystem Storage
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const ext = path.extname(file.name)
    const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, "_")
    const uniqueFilename = `${Date.now()}-${base}${ext}`
    const filePath = path.join(uploadDir, uniqueFilename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(filePath, buffer)

    const url = `/uploads/${uniqueFilename}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[upload] Upload error:", error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
