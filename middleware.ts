import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");
  // console.log(token)
  const hasOnboarded = token.first; // Adjust this based on your token/user object

  // Redirect guest users to /register
  if (isGuest && !["/register", "/login"].includes(pathname)) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/register?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  // After registration, redirect to onboarding if not completed
  if (!isGuest && !hasOnboarded && pathname === "/register") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // If user tries to access / or /login without onboarding, redirect to onboarding
  if (!isGuest && !hasOnboarded && ["/", "/login"].includes(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (
    token &&
    !isGuest &&
    ["/login", "/register"].includes(pathname) &&
    hasOnboarded
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
