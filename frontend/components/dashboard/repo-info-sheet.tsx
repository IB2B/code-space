"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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

  const imageFile = repo.Image?.[0];
  const videoFile = repo.video?.[0];

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
            <p className="text-sm">{repo.contributors || "—"}</p>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <p className="text-sm whitespace-pre-wrap">{repo.description || "—"}</p>
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

          {/* Image */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image</p>
            {imageFile ? (
              <img
                src={imageFile.url}
                alt={repo.repo_name}
                className="rounded-md w-full object-cover max-h-64"
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Video */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Video</p>
            {videoFile ? (
              <video
                src={videoFile.url}
                controls
                className="rounded-md w-full max-h-64"
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
