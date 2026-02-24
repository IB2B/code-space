import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DevelopersTable } from "@/components/dashboard/developers-table";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

type SessionUser = {
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
};

export default async function DevelopersPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;

  if (!raw) redirect("/login");

  const user: SessionUser = JSON.parse(raw);

  // Check role directly from Baserow
  const res = await fetch(
    `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(user.email)}`,
    {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
      cache: "no-store",
    },
  );
  if (!res.ok) redirect("/dashboard");
  const data = await res.json();
  if (data.results?.[0]?.Role?.toLowerCase() !== "admin") redirect("/dashboard");

  return (
    <>
      <DashboardHeader user={user} page="Developers" />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
          <p className="text-sm text-muted-foreground">
            View all registered users and their roles.
          </p>
        </div>

        <DevelopersTable />
      </main>
    </>
  );
}
