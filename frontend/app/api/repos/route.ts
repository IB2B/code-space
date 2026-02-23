import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const REPOS_TABLE_ID = process.env.BASEROW_REPOS_TABLE_ID;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);

    // Fetch role directly from Baserow
    let isOwner = false;
    const userRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(sessionUser.email)}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        cache: "no-store",
      },
    );
    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData.count > 0) {
        isOwner = userData.results[0].Role?.toLowerCase() === "admin";
      }
    }

    // Owner sees all repos, developer sees only their own
    const url = isOwner
      ? `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true&size=200`
      : `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true&filter__contributors__equal=${encodeURIComponent(sessionUser.fullName.toLowerCase())}`;

    const res = await fetch(url, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Baserow list repos error:", res.status, body);
      return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }

    const data = await res.json();
    const repos = data.results ?? [];

    // Build contributor → avatar lookup from users table
    let avatarMap: Record<string, string> = {};
    try {
      const allUsersRes = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&size=200`,
        {
          headers: { Authorization: `Token ${BASEROW_TOKEN}` },
          cache: "no-store",
        },
      );
      if (allUsersRes.ok) {
        const allUsersData = await allUsersRes.json();
        for (const u of allUsersData.results ?? []) {
          const pfp = u.pfp as { url: string; thumbnails?: { small?: { url: string } } }[] | undefined;
          const url = pfp?.[0]?.thumbnails?.small?.url ?? pfp?.[0]?.url;
          if (u.username && url) {
            avatarMap[(u.username as string).toLowerCase()] = url;
          }
        }
      }
    } catch {}

    const enriched = repos.map((r: Record<string, unknown>) => ({
      ...r,
      contributorAvatar: avatarMap[(r.contributors as string)?.toLowerCase()] ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("GET /api/repos error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);
    const { repoName, status, description, deploymentLink, imageToken, videoToken } = await req.json();

    if (!repoName) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    const rowData = {
      repo_name: repoName,
      description: description ?? "",
      status: status ?? "",
      contributors: sessionUser.fullName.toLowerCase(),
      deployment: deploymentLink ?? "",
      ...(imageToken ? { Image: [{ name: imageToken }] } : {}),
      ...(videoToken ? { video: [{ name: videoToken }] } : {}),
    };

    console.log("[repos] Creating row with data:", JSON.stringify(rowData));

    const createRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rowData),
      },
    );

    if (!createRes.ok) {
      const body = await createRes.text();
      console.error("Baserow create repo error:", createRes.status, body);
      return NextResponse.json({ error: "Failed to save repository" }, { status: 500 });
    }

    const created = await createRes.json();
    console.log("[repos] Row created:", JSON.stringify(created));
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/repos error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
