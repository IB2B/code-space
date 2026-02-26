"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, Info, Trash2, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Repo } from "./edit-repo-dialog";
import type { StatusFilter, SortField, SortDir } from "./repos-section";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const statusLabel: Record<string, string> = {
  in_progress: "In Progress",
  done: "Completed",
  cancelled: "Cancelled",
};

const statusOrder: Record<string, number> = {
  in_progress: 0,
  done: 1,
  cancelled: 2,
};

export function ReposTable({
  currentUser,
  refreshKey,
  search = "",
  statusFilter = "all",
  sortField = "name",
  sortDir = "asc",
  isAdmin = false,
}: {
  currentUser: string;
  refreshKey?: number;
  search?: string;
  statusFilter?: StatusFilter;
  sortField?: SortField;
  sortDir?: SortDir;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedMap, setLastUpdatedMap] = useState<Record<string, string>>({});
  const [deleteRepo, setDeleteRepo] = useState<Repo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fetchRepos = useCallback(() => {
    setLoading(true);
    fetch("/api/repos")
      .then((r) => r.json())
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos, refreshKey]);

  useEffect(() => {
    fetch("/api/github/last-updated")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          setLastUpdatedMap(data);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = repos;

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((r) => r.repo_name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.repo_name.localeCompare(b.repo_name);
      } else {
        cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [repos, search, statusFilter, sortField, sortDir]);

  async function confirmDelete() {
    if (!deleteRepo) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/repos/${deleteRepo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete repository.");
        return;
      }
      toast.success("Repository deleted.");
      fetchRepos();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDeleting(false);
      setDeleteRepo(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead className="max-w-xs">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contributors</TableHead>
              <TableHead>Repo Link</TableHead>
              <TableHead>Deployment</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {repos.length === 0 ? "No repositories added yet." : "No repositories match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((repo) => (
                <TableRow key={repo.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{repo.repo_name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                    {repo.description || "—"}
                  </TableCell>
                  <TableCell>
                    {repo.status ? (
                      <Badge
                        variant={repo.status === "in_progress" ? "default" : repo.status === "cancelled" ? "destructive" : "secondary"}
                        className={repo.status === "in_progress" ? "bg-blue-500 hover:bg-blue-500 text-white" : repo.status === "done" ? "bg-green-500 hover:bg-green-500 text-white" : ""}
                      >
                        {statusLabel[repo.status] ?? repo.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(repo.contributorsList ?? []).length > 0 ? (
                      <div className="flex -space-x-2">
                        {repo.contributorsList!.slice(0, 4).map((c) => (
                          <Tooltip key={c.name}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7 border-2 border-background cursor-pointer">
                                {c.avatar && <AvatarImage src={c.avatar} alt={c.name} />}
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                                  {c.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              {c.name.toLowerCase() === currentUser.toLowerCase() ? "You" : c.name}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {repo.contributorsList!.length > 4 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium cursor-pointer">
                                +{repo.contributorsList!.length - 4}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {repo.contributorsList!.slice(4).map((c) => c.name).join(", ")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {repo.repo_link ? (
                      <a
                        href={repo.repo_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        Link
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {repo.deployment ? (
                      <a
                        href={repo.deployment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        Link
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lastUpdatedMap[repo.repo_name.toLowerCase()] ? (
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {timeAgo(lastUpdatedMap[repo.repo_name.toLowerCase()])}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard/repos/${repo.id}`)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    {!isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/repos/${repo.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteRepo(repo)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteRepo} onOpenChange={(open) => { if (!open) setDeleteRepo(null); }}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete repository</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteRepo?.repo_name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
