import { sql } from "./db"

export interface UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  email: string
  displayName?: string
}

/**
 * Fetches and validates a session by token directly from Neon.
 */
export async function getSessionByToken(token: string): Promise<UserSession | null> {
  if (!token) return null
  
  try {
    const results = await sql`
      SELECT 
        s.id as session_id, 
        s.user_id, 
        s.token, 
        s.expires_at, 
        u.email, 
        p.display_name
      FROM public.sessions s
      JOIN public.users u ON s.user_id = u.id
      LEFT JOIN public.profiles p ON u.id = p.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `
    
    if (results && results.length > 0) {
      const row = results[0]
      return {
        id: row.session_id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        email: row.email,
        displayName: row.display_name || undefined
      }
    }
    
    return null
  } catch (err) {
    console.error("[session] Error in getSessionByToken:", err)
    return null
  }
}

/**
 * Returns the currently authenticated user session.
 * Works inside Next.js Server Components, Server Actions, and API Routes.
 */
export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const token = cookieStore.get("traveloid_session")?.value
    if (!token) return null
    return await getSessionByToken(token)
  } catch (err) {
    if (
      err instanceof Error &&
      ((err as any).digest === "DYNAMIC_SERVER_USAGE" ||
        err.message.includes("Dynamic server usage") ||
        err.message.includes("dynamic-server-error"))
    ) {
      throw err
    }
    console.error("[session] Error reading cookies in getSessionUser:", err)
    return null
  }
}
