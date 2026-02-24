"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { GitFork, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; icon: LucideIcon; href: string };

const baseNav: NavItem[] = [
  { label: "Repositories", icon: GitFork, href: "/dashboard" },
];

const ownerNav: NavItem[] = [
  ...baseNav,
  { label: "Developers", icon: Users, href: "/dashboard/developers" },
];

export function AppSidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const navItems = role?.toLowerCase() === "admin" ? ownerNav : baseNav;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-3 py-2">
          <span className="font-semibold text-sm tracking-tight">IB2B</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
