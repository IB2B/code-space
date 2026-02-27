import { NextResponse } from "next/server";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function GET(request: Request) {
  try {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  // Fetch GitHub user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const githubUser = await userRes.json();

  if (!githubUser?.login) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  // Fetch primary verified email (public profile email may be null)
  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const emailsData = await emailsRes.json();
  const emails: { primary: boolean; verified: boolean; email: string }[] =
    Array.isArray(emailsData) ? emailsData : [];
  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ?? githubUser.email ?? "";

  const fullName = githubUser.name ?? githubUser.login;
  let role = "developer";

  // Upload GitHub avatar to Baserow
  let avatarFile: { name: string } | null = null;
  if (githubUser.avatar_url) {
    try {
      const uploadRes = await fetch(
        `${BASEROW_URL}/api/user-files/upload-via-url/`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${BASEROW_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: githubUser.avatar_url }),
        },
      );
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        avatarFile = { name: uploadData.name };
      }
    } catch {
      // Avatar upload failed — continue without it
    }
  }

  // Upsert user in Baserow
  let dbUserId: number | null = null;

  if (primaryEmail) {
    const checkRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(primaryEmail)}`,
      { headers: { Authorization: `Token ${BASEROW_TOKEN}` } },
    );

    if (checkRes.ok) {
      const checkData = await checkRes.json();

      if (checkData.count === 0) {
        // First login — create user
        const createRes = await fetch(
          `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${BASEROW_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: fullName,
              Role: "developer",
              Email: primaryEmail,
              password_hashed: "",
              Active: true,
              github_login: githubUser.login,
              ...(avatarFile && { pfp: [avatarFile] }),
            }),
          },
        );
        if (createRes.ok) {
          const created = await createRes.json();
          dbUserId = created.id;
        }
      } else {
        const existingUser = checkData.results[0];
        dbUserId = existingUser.id;
        role = existingUser["Role"] || "developer";

        // Update avatar and github_login on every login
        if (dbUserId) {
          const patchBody: Record<string, unknown> = {
            github_login: githubUser.login,
          };
          if (avatarFile) patchBody.pfp = [avatarFile];

          await fetch(
            `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/${dbUserId}/?user_field_names=true`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Token ${BASEROW_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(patchBody),
            },
          ).catch(() => {});
        }
      }
    }
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set(
    "session_user",
    JSON.stringify({
      id: dbUserId,
      fullName,
      email: primaryEmail,
      role,
      avatar: githubUser.avatar_url,
      githubLogin: githubUser.login,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  );

  response.cookies.set("github_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
}
