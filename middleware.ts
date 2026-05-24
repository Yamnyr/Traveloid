import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionByToken } from "@/lib/session"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApi = path.startsWith("/api")
  const isAuthPage = path.startsWith("/auth")
  const isRootPage = path === "/"
  
  // Protect all frontend pages except /auth/login, /auth/sign-up, and home page /
  const isProtected = !isApi && !isAuthPage && !isRootPage

  if (isProtected) {
    const token = request.cookies.get("traveloid_session")?.value
    
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    const session = await getSessionByToken(token)
    
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      const response = NextResponse.redirect(url)
      // Clear invalid session cookie
      response.cookies.set("traveloid_session", "", {
        path: "/",
        expires: new Date(0),
      })
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all paths except static assets and files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
