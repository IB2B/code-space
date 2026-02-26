"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, X, ImagePlus, VideoIcon } from "lucide-react";

export type BaserowFile = {
  url: string;
  thumbnail_url: string;
  name: string;
  mime_type: string;
  is_image: boolean;
};

export type Repo = {
  id: number;
  repo_name: string;
  description: string;
  status: string;
  contributors: string;
  repo_link: string;
  deployment: string;
  user_docs: string;
  tech_docs: string;
  env_vars: string;
  Image: BaserowFile[];
  video: BaserowFile[];
  contributorAvatar?: string | null;
  contributorsList?: { name: string; avatar: string | null }[];
};

type MediaItem = { type: "existing"; url: string; name: string } | { type: "new"; file: File; preview: string; name: string };

type PreviewItem = { type: "image" | "video"; url: string; name: string };

function truncateName(name: string, max = 20): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".") !== -1 ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 3;
  if (keep <= 0) return name.slice(0, max - 3) + "...";
  return base.slice(0, keep) + "..." + ext;
}

export function EditRepoDialog({
  repo,
  open,
  onOpenChange,
  onSuccess,
}: {
  repo: Repo | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [userDocs, setUserDocs] = useState("");
  const [techDocs, setTechDocs] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [images, setImages] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [imagesChanged, setImagesChanged] = useState(false);
  const [videosChanged, setVideosChanged] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<PreviewItem | null>(null);

  useEffect(() => {
    if (repo) {
      setStatus(repo.status ?? "");
      setDescription(repo.description ?? "");
      setRepoLink(repo.repo_link ?? "");
      setDeploymentLink(repo.deployment ?? "");
      setUserDocs(repo.user_docs ?? "");
      setTechDocs(repo.tech_docs ?? "");
      setEnvVars(repo.env_vars ?? "");

      setImages(
        (repo.Image ?? []).map((f) => ({ type: "existing" as const, url: f.url, name: f.name }))
      );
      setVideos(
        (repo.video ?? []).map((f) => ({ type: "existing" as const, url: f.url, name: f.name }))
      );
      setImagesChanged(false);
      setVideosChanged(false);
      setPreview(null);
    }
  }, [repo]);

  function addImages(files: FileList | null) {
    if (!files) return;
    const items: MediaItem[] = Array.from(files).map((f) => ({
      type: "new" as const,
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }));
    setImages((prev) => [...prev, ...items]);
    setImagesChanged(true);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagesChanged(true);
  }

  function addVideos(files: FileList | null) {
    if (!files) return;
    const items: MediaItem[] = Array.from(files).map((f) => ({
      type: "new" as const,
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name,
    }));
    setVideos((prev) => [...prev, ...items]);
    setVideosChanged(true);
  }

  function removeVideo(index: number) {
    setVideos((prev) => prev.filter((_, i) => i !== index));
    setVideosChanged(true);
  }

  function getMediaUrl(item: MediaItem): string {
    return item.type === "existing" ? item.url : item.preview;
  }

  async function handleSubmit() {
    if (!repo) return;
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

      const body: Record<string, unknown> = { status, description, repoLink, deploymentLink, userDocs, techDocs, envVars };

      if (imagesChanged) {
        const imageTokens: string[] = [];
        for (const img of images) {
          if (img.type === "existing") {
            imageTokens.push(img.name);
          } else {
            imageTokens.push(await uploadFile(img.file));
          }
        }
        body.imageTokens = imageTokens;
      }

      if (videosChanged) {
        const videoTokens: string[] = [];
        for (const vid of videos) {
          if (vid.type === "existing") {
            videoTokens.push(vid.name);
          } else {
            videoTokens.push(await uploadFile(vid.file));
          }
        }
        body.videoTokens = videoTokens;
      }

      const res = await fetch(`/api/repos/${repo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update repository.");
        return;
      }

      toast.success("Repository updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="font-sans w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>{repo?.repo_name}</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-5 py-4 flex-1 overflow-y-auto px-6">
            {/* Read-only fields */}
            <div className="space-y-1.5">
              <Label>Repository name</Label>
              <Input value={repo?.repo_name ?? ""} readOnly className="bg-muted text-muted-foreground" />
            </div>

            <div className="space-y-1.5">
              <Label>Contributors</Label>
              <div className="flex flex-wrap gap-2 rounded-md border bg-muted p-2 min-h-9">
                {(repo?.contributorsList ?? []).length > 0
                  ? repo!.contributorsList!.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Avatar className="h-5 w-5">
                          {c.avatar && <AvatarImage src={c.avatar} alt={c.name} />}
                          <AvatarFallback className="text-[8px]">
                            {c.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{c.name}</span>
                      </div>
                    ))
                  : <span className="text-sm text-muted-foreground">{repo?.contributors || "—"}</span>
                }
              </div>
            </div>

            {/* Editable fields */}
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-repo-link">Repository link</Label>
              <Input
                id="edit-repo-link"
                placeholder="https://github.com/IB2B/your-repo"
                value={repoLink}
                onChange={(e) => setRepoLink(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-deployment">Deployment link</Label>
              <Input
                id="edit-deployment"
                placeholder="https://your-app.com"
                value={deploymentLink}
                onChange={(e) => setDeploymentLink(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe your repository..."
                className="resize-none"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-user-docs">User documentation</Label>
              <Textarea
                id="edit-user-docs"
                placeholder="How to use this project: features, setup steps, usage instructions..."
                className="resize-none"
                rows={4}
                value={userDocs}
                onChange={(e) => setUserDocs(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-tech-docs">Technical documentation</Label>
              <Textarea
                id="edit-tech-docs"
                placeholder="For developers: architecture, tech stack, API endpoints, folder structure, how to contribute..."
                className="resize-none"
                rows={4}
                value={techDocs}
                onChange={(e) => setTechDocs(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-env">.env</Label>
              <Textarea
                id="edit-env"
                placeholder={"DATABASE_URL=\nAPI_KEY=\nNEXT_PUBLIC_APP_URL=\n..."}
                className="resize-none font-mono text-sm"
                rows={4}
                value={envVars}
                onChange={(e) => setEnvVars(e.target.value)}
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Images</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Add images
              </Button>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {images.map((img, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1.5 pr-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => setPreview({ type: "image", url: getMediaUrl(img), name: img.name })}
                    >
                      <ImagePlus className="h-3 w-3 shrink-0" />
                      <span className="max-w-30 truncate">{truncateName(img.name)}</span>
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { addImages(e.target.files); e.target.value = ""; }}
              />
            </div>

            {/* Videos */}
            <div className="space-y-2">
              <Label>Videos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => videoInputRef.current?.click()}
              >
                <VideoIcon className="mr-2 h-4 w-4" />
                Add videos
              </Button>
              {videos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {videos.map((vid, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1.5 pr-1 cursor-pointer hover:bg-secondary/80"
                      onClick={() => setPreview({ type: "video", url: getMediaUrl(vid), name: vid.name })}
                    >
                      <VideoIcon className="h-3 w-3 shrink-0" />
                      <span className="max-w-30 truncate">{truncateName(vid.name)}</span>
                      <button
                        type="button"
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); removeVideo(i); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => { addVideos(e.target.files); e.target.value = ""; }}
              />
            </div>
          </div>

          <div className="pt-4 border-t px-6 pb-6">
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl font-sans p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="truncate text-sm">{preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            {preview?.type === "image" && (
              <img src={preview.url} alt={preview.name} className="w-full rounded-md object-contain max-h-[70vh]" />
            )}
            {preview?.type === "video" && (
              <video src={preview.url} controls autoPlay className="w-full rounded-md max-h-[70vh]" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
