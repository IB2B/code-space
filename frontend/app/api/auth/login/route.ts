import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/callback`,
    scope: "read:org repo user:email",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
  );
}
