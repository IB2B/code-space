import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: "read:org repo user:email",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
  );
}
