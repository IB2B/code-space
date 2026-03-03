import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set("session_user", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set("github_token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
