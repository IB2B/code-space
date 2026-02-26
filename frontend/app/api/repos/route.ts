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

    // Fetch all repos and users in parallel
    const [reposRes, allUsersRes] = await Promise.all([
      fetch(
        `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true&size=200`,
        { headers: { Authorization: `Token ${BASEROW_TOKEN}` }, cache: "no-store" },
      ),
      fetch(
        `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&size=200`,
        { headers: { Authorization: `Token ${BASEROW_TOKEN}` }, cache: "no-store" },
      ),
    ]);

    if (!reposRes.ok) {
      const body = await reposRes.text();
      console.error("Baserow list repos error:", reposRes.status, body);
      return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }

    const data = await reposRes.json();
    const allRepos = (data.results ?? []) as Record<string, unknown>[];

    // For developers, filter to repos where they are a contributor
    const currentUsername = sessionUser.fullName.toLowerCase();
    const repos = isOwner
      ? allRepos
      : allRepos.filter((r) => {
          const contribs = ((r.contributors as string) || "")
            .split(",")
            .map((s: string) => s.trim().toLowerCase());
          return contribs.includes(currentUsername);
        });

    // Build contributor → avatar lookup from users table
    const avatarMap: Record<string, string> = {};
    if (allUsersRes.ok) {
      const allUsersData = await allUsersRes.json();
      for (const u of (allUsersData.results ?? []) as Record<string, unknown>[]) {
        const pfp = u.pfp as { url: string; thumbnails?: { small?: { url: string } } }[] | undefined;
        const url = pfp?.[0]?.thumbnails?.small?.url ?? pfp?.[0]?.url;
        if (u.username && url) {
          avatarMap[(u.username as string).toLowerCase()] = url;
        }
      }
    }

    const enriched = repos.map((r: Record<string, unknown>) => {
      const contribStr = (r.contributors as string) || "";
      const contribNames = contribStr
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      const contributorsList = contribNames.map((name) => ({
        name,
        avatar: avatarMap[name.toLowerCase()] ?? null,
      }));

      return {
        ...r,
        contributorsList,
        contributorAvatar: contributorsList[0]?.avatar ?? null,
      };
    });

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
    const githubToken = cookieStore.get("github_token")?.value;
    const { repoName, status, description, repoLink, deploymentLink, userDocs, techDocs, envVars, imageToken, videoToken } = await req.json();

    if (!repoName) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    // Check for duplicate repo name
    const dupeCheckRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/?user_field_names=true&filter__repo_name__equal=${encodeURIComponent(repoName)}`,
      { headers: { Authorization: `Token ${BASEROW_TOKEN}` }, cache: "no-store" },
    );
    if (dupeCheckRes.ok) {
      const dupeData = await dupeCheckRes.json();
      if (dupeData.count > 0) {
        return NextResponse.json(
          { error: "This repository has already been added." },
          { status: 409 },
        );
      }
    }

    // Fetch GitHub contributors and match to Baserow users
    let contributorUsernames: string[] = [];

    if (githubToken) {
      try {
        // Fetch all Baserow users to build github_login → username map
        const allUsersRes = await fetch(
          `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&size=200`,
          { headers: { Authorization: `Token ${BASEROW_TOKEN}` }, cache: "no-store" },
        );
        const loginToUsername: Record<string, string> = {};
        if (allUsersRes.ok) {
          const allUsersData = await allUsersRes.json();
          for (const u of (allUsersData.results ?? []) as Record<string, unknown>[]) {
            const ghLogin = u.github_login as string | undefined;
            const uname = u.username as string | undefined;
            if (ghLogin && uname) {
              loginToUsername[ghLogin.toLowerCase()] = uname.toLowerCase();
            }
          }
        }

        // Fetch contributors from GitHub
        const ghRes = await fetch(
          `https://api.github.com/repos/IB2B/${encodeURIComponent(repoName)}/contributors?per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: "application/vnd.github+json",
            },
          },
        );
        if (ghRes.ok) {
          const ghContributors = (await ghRes.json()) as { login: string }[];
          for (const c of ghContributors) {
            const login = c.login?.toLowerCase();
            if (login && loginToUsername[login]) {
              contributorUsernames.push(loginToUsername[login]);
            }
          }
        }
      } catch (err) {
        console.error("[repos] Failed to fetch GitHub contributors:", err);
      }
    }

    // Always include the current user
    const currentUsername = sessionUser.fullName.toLowerCase();
    if (!contributorUsernames.includes(currentUsername)) {
      contributorUsernames.push(currentUsername);
    }
    contributorUsernames = [...new Set(contributorUsernames)];

    const rowData = {
      repo_name: repoName,
      description: description ?? "",
      status: status ?? "",
      contributors: contributorUsernames.join(","),
      repo_link: repoLink ?? "",
      deployment: deploymentLink ?? "",
      user_docs: userDocs ?? "",
      tech_docs: techDocs ?? "",
      env_vars: envVars ?? "",
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
