import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

type SessionUser = {
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;

  let role: string | undefined;
  let user: SessionUser | null = null;

  if (raw) {
    const sessionUser = JSON.parse(raw);
    user = sessionUser;
    // Fetch role directly from Baserow using user's email
    try {
      const res = await fetch(
        `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(sessionUser.email)}`,
        {
          headers: { Authorization: `Token ${BASEROW_TOKEN}` },
          cache: "no-store",
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.count > 0) {
          role = data.results[0].Role;
        }
      }
    } catch {
      // Fallback to cookie role if Baserow is unreachable
      role = sessionUser.role;
    }
  }

  return (
    <SidebarProvider className="font-sans">
      <AppSidebar role={role} />
      <SidebarInset>
        {user && <DashboardHeader user={user} />}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
