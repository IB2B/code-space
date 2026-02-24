import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const githubToken = cookieStore.get("github_token")?.value;

  if (!githubToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch("https://api.github.com/orgs/IB2B/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: res.status });
  }

  const repos = await res.json();

  const simplified = repos.map((r: { id: number; name: string; full_name: string; description: string | null }) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
  }));

  return NextResponse.json(simplified);
}
