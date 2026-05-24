import { neon } from "@neondatabase/serverless"

let lazySql: any = null

function getSql() {
  if (!lazySql) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is missing. Please check your .env.local file.")
    }
    lazySql = neon(databaseUrl)
  }
  return lazySql
}

// Create a lazy Neon SQL client proxy to prevent import-time environment variable errors
export const sql = new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    return Reflect.apply(getSql(), thisArg, argumentsList)
  },
  get(target, prop, receiver) {
    return Reflect.get(getSql(), prop, receiver)
  }
}) as any

/**
 * Lazily fetches or creates a user profile in the Neon database.
 * This is crucial because Supabase Auth handles users on its own server/database,
 * and we sync the profile to Neon when the user logs in or views the app.
 */
export async function getOrCreateProfile(userId: string, email?: string, displayName?: string) {
  try {
    // 1. Try to fetch the existing profile from Neon
    const profiles = await sql`
      SELECT id, display_name, created_at 
      FROM public.profiles 
      WHERE id = ${userId}
    `
    
    if (profiles && profiles.length > 0) {
      return profiles[0]
    }

    // 2. If missing, insert the profile
    const fallbackName = displayName || (email ? email.split("@")[0] : "Traveler")
    
    console.log(`[db] Profile for ${userId} not found in Neon. Lazily creating with display name: "${fallbackName}"`)
    
    const newProfiles = await sql`
      INSERT INTO public.profiles (id, display_name)
      VALUES (${userId}, ${fallbackName})
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id, display_name, created_at
    `
    
    return newProfiles[0]
  } catch (err) {
    console.error(`[db] Error in getOrCreateProfile for user ${userId}:`, err)
    // Return a fallback profile so the app doesn't crash on DB issues
    return {
      id: userId,
      display_name: displayName || (email ? email.split("@")[0] : "Traveler"),
      created_at: new Date().toISOString()
    }
  }
}
