"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Loader2, Pencil, Info, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { EditRepoDialog, type Repo } from "./edit-repo-dialog";
import { RepoInfoSheet } from "./repo-info-sheet";
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
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRepo, setEditRepo] = useState<Repo | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [infoRepo, setInfoRepo] = useState<Repo | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [deleteRepo, setDeleteRepo] = useState<Repo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lastUpdatedMap, setLastUpdatedMap] = useState<Record<string, string>>({});

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
    if (!isAdmin) return;
    fetch("/api/github/last-updated")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object" && !data.error) {
          setLastUpdatedMap(data);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

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

  function openEdit(repo: Repo) {
    setEditRepo(repo);
    setEditOpen(true);
  }

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
              <TableHead>Status</TableHead>
              <TableHead>Contributors</TableHead>
              <TableHead className="max-w-xs">Description</TableHead>
              <TableHead>Deployment</TableHead>
              {isAdmin && <TableHead>Last Updated</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  {repos.length === 0 ? "No repositories added yet." : "No repositories match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((repo) => (
                <TableRow key={repo.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{repo.repo_name}</TableCell>
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
                    {repo.contributors ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {repo.contributorAvatar && <AvatarImage src={repo.contributorAvatar} alt={repo.contributors} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                            {repo.contributors.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {repo.contributors.toLowerCase() === currentUser.toLowerCase()
                          ? <span className="text-muted-foreground text-sm italic">You</span>
                          : <span className="text-sm">{repo.contributors}</span>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                    {repo.description || "—"}
                  </TableCell>
                  <TableCell>
                    {repo.deployment ? (
                      <a
                        href={repo.deployment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm truncate max-w-40 block"
                      >
                        {repo.deployment}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {(() => {
                        const pushed = lastUpdatedMap[repo.repo_name.toLowerCase()];
                        if (!pushed) return <span className="text-muted-foreground text-sm">—</span>;
                        return (
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo(pushed)}
                          </span>
                        );
                      })()}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setInfoRepo(repo); setInfoOpen(true); }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    {!isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(repo)}
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

      <EditRepoDialog
        repo={editRepo}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchRepos}
      />
      <RepoInfoSheet
        repo={infoRepo}
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />

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
