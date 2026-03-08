import { NextResponse } from "next/server";

export function middleware(req) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (req.nextUrl.pathname === "/admin/login") {
      return NextResponse.next();
    }

    const auth = req.cookies.get("admin-auth");

    if (!auth) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
