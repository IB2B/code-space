import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;
const REPOS_TABLE_ID = process.env.BASEROW_REPOS_TABLE_ID;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);

    // Verify role directly from Baserow
    const userRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(sessionUser.email)}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        cache: "no-store",
      },
    );
    if (!userRes.ok || (await userRes.json().then((d) => d.results?.[0]?.Role?.toLowerCase())) !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch users and repos in parallel
    const [usersRes, reposRes] = await Promise.all([
      fetch(
        `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&size=200`,
        {
          headers: { Authorization: `Token ${BASEROW_TOKEN}` },
          cache: "no-store",
        },
      ),
      fetch(
        `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true&size=200`,
        {
          headers: { Authorization: `Token ${BASEROW_TOKEN}` },
          cache: "no-store",
        },
      ),
    ]);

    if (!usersRes.ok) {
      const body = await usersRes.text();
      console.error("Baserow list users error:", usersRes.status, body);
      return NextResponse.json({ error: "Failed to fetch developers" }, { status: 500 });
    }

    const usersData = await usersRes.json();
    const reposData = reposRes.ok ? await reposRes.json() : { results: [] };
    const allRepos = (reposData.results ?? []) as Record<string, unknown>[];

    const users = (usersData.results ?? [])
      .filter((u: Record<string, unknown>) => u.username && u.Email)
      .map((u: Record<string, unknown>) => {
        const name = (u.username as string).toLowerCase();
        const repos = allRepos.filter((r) => {
          const contribs = ((r.contributors as string) || "")
            .split(",")
            .map((s: string) => s.trim().toLowerCase());
          return contribs.includes(name);
        });
        const totalRepos = repos.length;
        const activeRepos = repos.filter((r) => r.status === "in_progress").length;
        const completedRepos = repos.filter((r) => r.status === "done").length;
        const repoNames = repos.map((r) => r.repo_name as string);

        const pfpArray = u.pfp as { url: string; thumbnails?: { small?: { url: string } } }[] | undefined;
        const avatar = pfpArray?.[0]?.thumbnails?.small?.url ?? pfpArray?.[0]?.url ?? null;

        return {
          id: u.id,
          username: u.username,
          email: u.Email,
          role: u.Role,
          active: u.active as boolean,
          avatar,
          totalRepos,
          activeRepos,
          completedRepos,
          repoNames,
        };
      });

    return NextResponse.json(users);
  } catch (err) {
    console.error("GET /api/developers error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
