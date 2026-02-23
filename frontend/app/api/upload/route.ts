import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_ADMIN_EMAIL = process.env.BASEROW_ADMIN_EMAIL;
const BASEROW_ADMIN_PASSWORD = process.env.BASEROW_ADMIN_PASSWORD;

async function getBaserowJwt(): Promise<string> {
  const res = await fetch(`${BASEROW_URL}/api/user/token-auth/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: BASEROW_ADMIN_EMAIL, password: BASEROW_ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Baserow JWT auth failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.token as string;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const jwt = await getBaserowJwt();

    // Read file bytes and reconstruct as Blob to ensure proper forwarding in Node.js
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: file.type });

    const uploadForm = new FormData();
    uploadForm.append("file", blob, file.name);

    const uploadRes = await fetch(`${BASEROW_URL}/api/user-files/upload-file/`, {
      method: "POST",
      headers: {
        Authorization: `JWT ${jwt}`,
      },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text();
      console.error("[upload] Baserow upload error:", uploadRes.status, body);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const data = await uploadRes.json();
    console.log("[upload] Baserow upload success:", data.name);
    return NextResponse.json({ name: data.name, url: data.url });
  } catch (err) {
    console.error("POST /api/upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
