"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
};

export function AddRepoDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);

  const [selectedRepo, setSelectedRepo] = useState("");
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]));
  }, [open]);

  const loadingRepos = open && repos === null;

  function handleClose(value: boolean) {
    setOpen(value);
    if (!value) {
      setSelectedRepo("");
      setStatus("");
      setDescription("");
      setDeploymentLink("");
      setImageFile(null);
      setVideoFile(null);
      setRepos(null);
    }
  }

  async function handleSubmit() {
    if (!selectedRepo) {
      toast.error("Please select a repository.");
      return;
    }

    setSubmitting(true);
    try {
      async function uploadFile(file: File): Promise<string> {
        const form = new FormData();
        form.append("file", file);
        const r = await fetch("/api/upload", { method: "POST", body: form });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? `Upload failed (${r.status})`);
        }
        const d = await r.json();
        return d.name as string;
      }

      const [imageToken, videoToken] = await Promise.all([
        imageFile ? uploadFile(imageFile) : Promise.resolve(null),
        videoFile ? uploadFile(videoFile) : Promise.resolve(null),
      ]);

      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName: selectedRepo, status, description, deploymentLink, imageToken, videoToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to add repository.");
        return;
      }

      toast.success("Added successfully!");
      handleClose(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="shrink-0">Add repo</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md font-sans">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Repo name */}
          <div className="space-y-1.5">
            <Label>Repository name</Label>
            <Select
              disabled={loadingRepos}
              value={selectedRepo}
              onValueChange={setSelectedRepo}
            >
              <SelectTrigger className="w-full">
                {loadingRepos ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading repos...
                  </span>
                ) : (
                  <SelectValue placeholder="Select a repository" />
                )}
              </SelectTrigger>
              <SelectContent className="font-sans">
                {(repos ?? []).map((repo) => (
                  <SelectItem key={repo.id} value={repo.name}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-image">Image</Label>
            <Input
              id="repo-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Video */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-video">Video</Label>
            <Input
              id="repo-video"
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Deployment Link */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-deployment">Deployment link</Label>
            <Input
              id="repo-deployment"
              placeholder="https://your-app.com"
              value={deploymentLink}
              onChange={(e) => setDeploymentLink(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="repo-description">Description</Label>
            <Textarea
              id="repo-description"
              placeholder="Describe your repository..."
              className="resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            className="w-full mt-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add repository
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
