import { destroySession } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    await destroySession()
  } catch (err) {
    console.error("[signout] Error destroying session:", err)
  }

  revalidatePath("/", "layout")
  return NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 302,
  })
}
