import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const REPOS_TABLE_ID = process.env.BASEROW_REPOS_TABLE_ID;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const delRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/${id}/`,
      {
        method: "DELETE",
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      },
    );

    if (!delRes.ok) {
      const body = await delRes.text();
      console.error("Baserow delete repo error:", delRes.status, body);
      return NextResponse.json({ error: "Failed to delete repository" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/repos/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("session_user")?.value;

    if (!raw) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, description, repoLink, deploymentLink, userDocs, techDocs, envVars, imageToken, videoToken } = await req.json();

    const rowData: Record<string, unknown> = {
      status: status ?? "",
      description: description ?? "",
      repo_link: repoLink ?? "",
      deployment: deploymentLink ?? "",
      user_docs: userDocs ?? "",
      tech_docs: techDocs ?? "",
      env_vars: envVars ?? "",
    };

    if (imageToken !== undefined) {
      rowData.Image = imageToken ? [{ name: imageToken }] : [];
    }
    if (videoToken !== undefined) {
      rowData.video = videoToken ? [{ name: videoToken }] : [];
    }

    const patchRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${REPOS_TABLE_ID}/${id}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rowData),
      },
    );

    if (!patchRes.ok) {
      const body = await patchRes.text();
      console.error("Baserow update repo error:", patchRes.status, body);
      return NextResponse.json({ error: "Failed to update repository" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/repos/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
