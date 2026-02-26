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

  // Image state: existing URL or new file or removed
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (repo) {
      setStatus(repo.status ?? "");
      setDescription(repo.description ?? "");
      setRepoLink(repo.repo_link ?? "");
      setDeploymentLink(repo.deployment ?? "");
      setUserDocs(repo.user_docs ?? "");
      setTechDocs(repo.tech_docs ?? "");
      setEnvVars(repo.env_vars ?? "");

      const img = repo.Image?.[0];
      setImagePreview(img?.url ?? null);
      setNewImageFile(null);
      setImageRemoved(false);

      const vid = repo.video?.[0];
      setVideoPreview(vid?.url ?? null);
      setNewVideoFile(null);
      setVideoRemoved(false);
    }
  }, [repo]);

  function handleImageChange(file: File | null) {
    if (file) {
      setNewImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageRemoved(false);
    }
  }

  function removeImage() {
    setNewImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleVideoChange(file: File | null) {
    if (file) {
      setNewVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoRemoved(false);
    }
  }

  function removeVideo() {
    setNewVideoFile(null);
    setVideoPreview(null);
    setVideoRemoved(true);
    if (videoInputRef.current) videoInputRef.current.value = "";
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

      // Upload new files in parallel if needed
      const [imageToken, videoToken] = await Promise.all([
        newImageFile ? uploadFile(newImageFile) : Promise.resolve(null),
        newVideoFile ? uploadFile(newVideoFile) : Promise.resolve(null),
      ]);

      const body: Record<string, unknown> = { status, description, repoLink, deploymentLink, userDocs, techDocs, envVars };

      // Only send image/video tokens when changed
      if (newImageFile) {
        body.imageToken = imageToken;
      } else if (imageRemoved) {
        body.imageToken = "";
      }

      if (newVideoFile) {
        body.videoToken = videoToken;
      } else if (videoRemoved) {
        body.videoToken = "";
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

          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            {imagePreview ? (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="rounded-md w-full object-cover max-h-48"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-foreground/30 transition-colors cursor-pointer"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Click to upload an image</span>
              </button>
            )}
            {imagePreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => imageInputRef.current?.click()}
              >
                Replace image
              </Button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Video */}
          <div className="space-y-2">
            <Label>Video</Label>
            {videoPreview ? (
              <div className="relative group">
                <video
                  src={videoPreview}
                  controls
                  className="rounded-md w-full max-h-48"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-foreground/30 transition-colors cursor-pointer"
              >
                <VideoIcon className="h-8 w-8" />
                <span className="text-sm">Click to upload a video</span>
              </button>
            )}
            {videoPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => videoInputRef.current?.click()}
              >
                Replace video
              </Button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
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
  );
}
