import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("github_token")?.value;
  const raw = cookieStore.get("session_user")?.value;

  if (!githubToken || !raw) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessionUser = JSON.parse(raw);
  const myLogin = (sessionUser.githubLogin as string)?.toLowerCase();

  const res = await fetch("https://api.github.com/orgs/IB2B/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: res.status });
  }

  const repos = (await res.json()) as { id: number; name: string; full_name: string; description: string | null }[];

  // Check each repo's contributors in parallel, keep only repos where the user is a contributor
  const checks = await Promise.all(
    repos.map(async (r) => {
      try {
        const contribRes = await fetch(
          `https://api.github.com/repos/IB2B/${encodeURIComponent(r.name)}/contributors?per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github+json",
            },
          },
        );
        if (!contribRes.ok) return null;
        const contributors = (await contribRes.json()) as { login: string }[];
        const isContributor = contributors.some(
          (c) => c.login?.toLowerCase() === myLogin,
        );
        return isContributor ? r : null;
      } catch {
        return null;
      }
    }),
  );

  const myRepos = checks
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
    }));

  return NextResponse.json(myRepos);
}
