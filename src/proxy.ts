import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/"]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/forgot-password(.*)"]);

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // ── Auth routes (/sign-in, /sign-up) ──────────────────────────────
  if (isAuthRoute(req)) {
    // Logged-in users are immediately bounced to their dashboard
    if (userId) {
      return NextResponse.redirect(
        new URL(role ? `/${role}` : "/", req.url)
      );
    }
    // Not logged in — let them through
    return NextResponse.next();
  }

  // ── Public routes (landing page, etc.) ───────────────────────────
  if (isPublicRoute(req)) return NextResponse.next();

  // ── Everything else requires authentication ───────────────────────
  if (!userId) {
    // Preserve the original URL so we can redirect back after login
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ── Role-based access control ─────────────────────────────────────
  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req)) {
      if (!role || !allowedRoles.includes(role)) {
        // Wrong role — send to their own dashboard, not a 403
        return NextResponse.redirect(
          new URL(role ? `/${role}` : "/", req.url)
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};