"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Repo } from "./edit-repo-dialog";

const statusLabel: Record<string, string> = {
  in_progress: "In Progress",
  done: "Completed",
  cancelled: "Cancelled",
};

export function RepoInfoSheet({
  repo,
  open,
  onOpenChange,
}: {
  repo: Repo | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!repo) return null;

  const imageFiles = repo.Image ?? [];
  const videoFiles = repo.video ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="font-sans w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{repo.repo_name}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 py-4 flex-1 overflow-y-auto px-6 pb-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            {repo.status ? (
              <Badge
                variant={repo.status === "in_progress" ? "default" : repo.status === "cancelled" ? "destructive" : "secondary"}
                className={repo.status === "in_progress" ? "bg-blue-500 hover:bg-blue-500 text-white" : repo.status === "done" ? "bg-green-500 hover:bg-green-500 text-white" : ""}
              >
                {statusLabel[repo.status] ?? repo.status}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">No status</span>
            )}
          </div>

          {/* Contributors */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contributors</p>
            {(repo.contributorsList ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {repo.contributorsList!.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      {c.avatar && <AvatarImage src={c.avatar} alt={c.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                        {c.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm">{repo.contributors || "—"}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <p className="text-sm whitespace-pre-wrap">{repo.description || "—"}</p>
          </div>

          {/* Repository Link */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Repository link</p>
            {repo.repo_link ? (
              <a
                href={repo.repo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all"
              >
                {repo.repo_link}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Deployment */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deployment</p>
            {repo.deployment ? (
              <a
                href={repo.deployment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all"
              >
                {repo.deployment}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* User Documentation */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User documentation</p>
            <p className="text-sm whitespace-pre-wrap">{repo.user_docs || "—"}</p>
          </div>

          {/* Technical Documentation */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Technical documentation</p>
            <p className="text-sm whitespace-pre-wrap">{repo.tech_docs || "—"}</p>
          </div>

          {/* Environment Variables */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">.env</p>
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted rounded-md p-3">{repo.env_vars || "—"}</pre>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Images</p>
            {imageFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {imageFiles.map((f, i) => (
                  <img
                    key={i}
                    src={f.url}
                    alt={repo.repo_name}
                    className="rounded-md w-full object-cover max-h-48"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Videos */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Videos</p>
            {videoFiles.length > 0 ? (
              <div className="flex flex-col gap-2">
                {videoFiles.map((f, i) => (
                  <video
                    key={i}
                    src={f.url}
                    controls
                    className="rounded-md w-full max-h-64"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
