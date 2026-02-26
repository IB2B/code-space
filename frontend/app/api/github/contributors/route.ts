import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const githubToken = cookieStore.get("github_token")?.value;
    const raw = cookieStore.get("session_user")?.value;

    if (!githubToken || !raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);
    const repo = req.nextUrl.searchParams.get("repo");

    if (!repo) {
      return NextResponse.json({ error: "Missing repo parameter" }, { status: 400 });
    }

    // Fetch Baserow users to build github_login → { username, avatar } map
    const allUsersRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&size=200`,
      { headers: { Authorization: `Token ${BASEROW_TOKEN}` }, cache: "no-store" },
    );

    const loginToUser: Record<string, { username: string; avatar: string | null }> = {};
    if (allUsersRes.ok) {
      const allUsersData = await allUsersRes.json();
      for (const u of (allUsersData.results ?? []) as Record<string, unknown>[]) {
        const ghLogin = u.github_login as string | undefined;
        const uname = u.username as string | undefined;
        const pfp = u.pfp as { url: string; thumbnails?: { small?: { url: string } } }[] | undefined;
        const avatarUrl = pfp?.[0]?.thumbnails?.small?.url ?? pfp?.[0]?.url ?? null;
        if (ghLogin && uname) {
          loginToUser[ghLogin.toLowerCase()] = { username: uname, avatar: avatarUrl };
        }
      }
    }

    // Fetch contributors from GitHub
    const ghRes = await fetch(
      `https://api.github.com/repos/IB2B/${encodeURIComponent(repo)}/contributors?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!ghRes.ok) {
      return NextResponse.json({ contributors: [], isContributor: false });
    }

    const ghContributors = (await ghRes.json()) as { login: string; avatar_url: string }[];

    const contributors: { login: string; username: string | null; avatar: string | null }[] = [];
    let isContributor = false;

    for (const c of ghContributors) {
      const login = c.login?.toLowerCase();
      const matched = login ? loginToUser[login] : undefined;

      contributors.push({
        login: c.login,
        username: matched?.username ?? null,
        avatar: matched?.avatar ?? c.avatar_url,
      });

      if (login === sessionUser.githubLogin?.toLowerCase()) {
        isContributor = true;
      }
    }

    return NextResponse.json({ contributors, isContributor });
  } catch (err) {
    console.error("GET /api/github/contributors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
