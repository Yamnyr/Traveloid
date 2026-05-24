import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth"

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error("[signout_api] Signout error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred during signout" },
      { status: 500 }
    )
  }
}
