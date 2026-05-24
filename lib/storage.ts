import { del } from "@vercel/blob"
import fs from "fs"
import path from "path"

/**
 * Safely deletes a photo file.
 * Handles both local filesystem files (/uploads/...) and remote Vercel Blob files.
 */
export async function deletePhotoFile(photoUrl: string): Promise<void> {
  try {
    if (!photoUrl) return

    if (photoUrl.startsWith("/uploads/")) {
      // Local upload deletion
      const filename = photoUrl.replace("/uploads/", "")
      const filePath = path.join(process.cwd(), "public", "uploads", filename)
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`[storage] Deleted local file successfully: ${filePath}`)
      } else {
        console.warn(`[storage] Local file not found on disk: ${filePath}`)
      }
    } else if (photoUrl.includes("public.blob.vercel-storage.com")) {
      // Vercel Blob deletion (only if token is configured)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        await del(photoUrl)
        console.log(`[storage] Deleted Vercel Blob successfully: ${photoUrl}`)
      } else {
        console.warn(`[storage] BLOB_READ_WRITE_TOKEN is missing. Skipping remote Vercel Blob deletion for: ${photoUrl}`)
      }
    }
  } catch (err) {
    console.error(`[storage] Failed to delete photo file for URL: ${photoUrl}`, err)
  }
}
