import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Fetch user from Neon
    const users = await sql`
      SELECT id, password_hash, salt 
      FROM public.users 
      WHERE email = ${normalizedEmail} 
      LIMIT 1
    `

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = users[0]

    // 2. Verify password hash
    const isValid = verifyPassword(password, user.password_hash, user.salt)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // 3. Create session and set cookie
    await createSession(user.id)

    return NextResponse.json(
      { success: true, userId: user.id },
      { status: 200 }
    )
  } catch (err) {
    console.error("[login_api] Login error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    )
  }
}
