"use client";

import { useState, useEffect, useMemo } from "react";
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ReposTable } from "@/components/dashboard/repos-table";
import { Loader2, GitFork, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Repo } from "@/components/dashboard/edit-repo-dialog";

const statusChartConfig = {
  count: { label: "Repos" },
  in_progress: { label: "In Progress", color: "hsl(217, 91%, 60%)" },
  done: { label: "Completed", color: "hsl(142, 71%, 45%)" },
  cancelled: { label: "Cancelled", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig;

const STATUS_COLORS: Record<string, string> = {
  in_progress: "hsl(217, 91%, 60%)",
  done: "hsl(142, 71%, 45%)",
  cancelled: "hsl(0, 84%, 60%)",
};

const contributorsChartConfig = {
  repos: { label: "Repos", color: "hsl(217, 91%, 60%)" },
} satisfies ChartConfig;

export function DashboardOverview({
  currentUser,
  isAdmin = false,
}: {
  currentUser: string;
  isAdmin?: boolean;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/repos")
      .then((r) => r.json())
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = repos.length;
    const inProgress = repos.filter((r) => r.status === "in_progress").length;
    const completed = repos.filter((r) => r.status === "done").length;
    const cancelled = repos.filter((r) => r.status === "cancelled").length;
    return { total, inProgress, completed, cancelled };
  }, [repos]);

  const pieData = useMemo(() => {
    return [
      { name: "in_progress", count: stats.inProgress },
      { name: "done", count: stats.completed },
      { name: "cancelled", count: stats.cancelled },
    ].filter((d) => d.count > 0);
  }, [stats]);

  const contributorsData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const repo of repos) {
      const contribs = repo.contributorsList ?? [];
      if (contribs.length > 0) {
        for (const c of contribs) {
          map[c.name] = (map[c.name] || 0) + 1;
        }
      } else if (repo.contributors) {
        for (const name of repo.contributors.split(",").map((s) => s.trim()).filter(Boolean)) {
          map[name] = (map[name] || 0) + 1;
        }
      }
    }
    return Object.entries(map)
      .map(([name, repos]) => ({ name, repos }))
      .sort((a, b) => b.repos - a.repos);
  }, [repos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Repos"
          value={stats.total}
          icon={<GitFork className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelled}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-62.5">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-6 pt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                    />
                    <span className="text-muted-foreground">
                      {statusChartConfig[entry.name as keyof typeof statusChartConfig]?.label}
                    </span>
                    <span className="font-medium">{entry.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contributors Bar Chart (admin only) */}
        {isAdmin && contributorsData.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={contributorsChartConfig} className="max-h-75 w-full">
                <BarChart data={contributorsData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <XAxis type="number" hide allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="repos" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* In-Progress Repos Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">In Progress</h2>
        <ReposTable
          currentUser={currentUser}
          statusFilter="in_progress"
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center justify-between px-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
