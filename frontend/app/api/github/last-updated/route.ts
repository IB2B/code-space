import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("github_token")?.value;

  if (!githubToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://api.github.com/orgs/IB2B/repos?per_page=100&sort=pushed",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch repos" }, { status: res.status });
    }

    const repos = await res.json();

    const map: Record<string, string> = {};
    for (const r of repos) {
      map[r.name.toLowerCase()] = r.pushed_at ?? r.updated_at ?? null;
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error("GET /api/github/last-updated error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
