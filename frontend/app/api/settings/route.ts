import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);

    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(sessionUser.email)}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    const data = await res.json();
    const user = data.results?.[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pfpArray = user.pfp as { url: string; thumbnails?: { small?: { url: string } } }[] | undefined;
    const avatar = pfpArray?.[0]?.thumbnails?.small?.url ?? pfpArray?.[0]?.url ?? null;

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.Email,
      role: user.Role,
      avatar,
      github_login: user.github_login,
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;
    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = JSON.parse(raw);

    const contentType = request.headers.get("content-type") || "";

    // Find user in Baserow
    const findRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(sessionUser.email)}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        cache: "no-store",
      },
    );

    if (!findRes.ok) {
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    const findData = await findRes.json();
    const user = findData.results?.[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    let newAvatarUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const username = formData.get("username") as string | null;
      const avatarFile = formData.get("avatar") as File | null;

      if (username?.trim()) {
        patch.username = username.trim();
      }

      if (avatarFile && avatarFile.size > 0) {
        // Upload file to Baserow
        const uploadForm = new FormData();
        uploadForm.append("file", avatarFile);

        const uploadRes = await fetch(
          `${BASEROW_URL}/api/user-files/upload-file/`,
          {
            method: "POST",
            headers: { Authorization: `Token ${BASEROW_TOKEN}` },
            body: uploadForm,
          },
        );

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          patch.pfp = [{ name: uploadData.name }];
          newAvatarUrl =
            uploadData.thumbnails?.small?.url ?? uploadData.url ?? null;
        }
      }
    } else {
      const body = await request.json();
      if (typeof body.username === "string" && body.username.trim()) {
        patch.username = body.username.trim();
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const patchRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/${user.id}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      },
    );

    if (!patchRes.ok) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // Update session cookie with new values
    const updatedSession = {
      ...sessionUser,
      ...(patch.username && { fullName: patch.username }),
      ...(newAvatarUrl && { avatar: newAvatarUrl }),
    };

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session_user", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("PATCH /api/settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
