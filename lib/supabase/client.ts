import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ryoieupkjxacwhsucgus.supabase.co"
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_SHTQu6yaRKdggKxyIsz7tA_qLK8AgUf"

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Supabase environment variables are missing. Please check your .env.local file or Vercel project settings.",
    )
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required. Please add them to your project settings.",
    )
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
