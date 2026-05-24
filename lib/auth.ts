import crypto from "crypto"
import { cookies } from "next/headers"
import { sql } from "./db"

/**
 * Generates a PBKDF2 hash and salt for a password.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return { hash, salt }
}

/**
 * Verifies a password against a stored PBKDF2 hash and salt.
 * Uses timingSafeEqual to guard against timing attacks.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
    const hashBuf = Buffer.from(hash, "hex")
    const verifyBuf = Buffer.from(verifyHash, "hex")
    
    if (hashBuf.length !== verifyBuf.length) {
      return false
    }
    
    return crypto.timingSafeEqual(hashBuf, verifyBuf)
  } catch (err) {
    console.error("[auth] Error verifying password:", err)
    return false
  }
}

/**
 * Creates a secure, cryptographically random session token in Neon DB,
 * and stores it in an HttpOnly, Secure cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  
  // Insert session into Neon
  await sql`
    INSERT INTO public.sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `
  
  // Set the HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set("traveloid_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
  
  return token
}

/**
 * Destroys the current user session from Neon DB and deletes the cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("traveloid_session")?.value
    
    if (token) {
      // Delete session from database
      await sql`
        DELETE FROM public.sessions 
        WHERE token = ${token}
      `
    }
    
    // Clear the cookie
    cookieStore.set("traveloid_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0), // Set to epoch to force immediate deletion
    })
  } catch (err) {
    console.error("[auth] Error destroying session:", err)
  }
}
