import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReposSection } from "@/components/dashboard/repos-section";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

type SessionUser = {
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
};

export default async function ReposPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;

  if (!raw) redirect("/login");

  const user: SessionUser = JSON.parse(raw);

  let isAdmin = false;
  try {
    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(user.email)}`,
      {
        headers: { Authorization: `Token ${BASEROW_TOKEN}` },
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        isAdmin = data.results[0].Role?.toLowerCase() === "admin";
      }
    }
  } catch {}

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <p className="text-sm text-muted-foreground">
          Manage all your repositories in one place — track, organize, and
          stay on top of your codebase effortlessly.
        </p>
      </div>

      <ReposSection currentUser={user.fullName} isAdmin={isAdmin} />
    </main>
  );
}
