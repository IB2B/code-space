import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // 2️⃣ Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to get access token" },
      { status: 400 },
    );
  }

  // 3️⃣ Fetch user info
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const user = await userRes.json();

  if (!user?.login) {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 400 },
    );
  }

  // 4️⃣ Verify user is org owner (admin)
  const orgRes = await fetch(
    `https://api.github.com/orgs/${process.env.GITHUB_ORG}/memberships/${user.login}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const orgData = await orgRes.json();

  if (orgData.role !== "admin") {
    return NextResponse.redirect(
      new URL("/login?error=not_owner", request.url),
    );
  }

  // 5️⃣ Store token in secure cookie
  const response = NextResponse.redirect(new URL("/overview", request.url));

  response.cookies.set("github_token", accessToken, {
    httpOnly: true, // JS cannot access it
    secure: true, // HTTPS only (in production)
    sameSite: "lax",
    path: "/",
  });

  return response;
}
