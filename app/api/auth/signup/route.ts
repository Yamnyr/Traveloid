import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // 1. Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM public.users 
      WHERE email = ${normalizedEmail} 
      LIMIT 1
    `

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // 2. Hash password
    const { hash, salt } = hashPassword(password)

    // 3. Create user
    const newUsers = await sql`
      INSERT INTO public.users (email, password_hash, salt)
      VALUES (${normalizedEmail}, ${hash}, ${salt})
      RETURNING id
    `
    const userId = newUsers[0].id

    // 4. Create profile
    const name = displayName?.trim() || normalizedEmail.split("@")[0]
    await sql`
      INSERT INTO public.profiles (id, display_name)
      VALUES (${userId}, ${name})
    `

    // 5. Establish session
    await createSession(userId)

    return NextResponse.json(
      { success: true, user: { id: userId, email: normalizedEmail } },
      { status: 201 }
    )
  } catch (err) {
    console.error("[signup_api] Registration error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred during signup" },
      { status: 500 }
    )
  }
}
