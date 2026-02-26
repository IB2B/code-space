"use client";

import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ChevronLeft, ChevronRight, Check, AlertCircle, X, ImagePlus, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
};

type Contributor = {
  login: string;
  username: string | null;
  avatar: string | null;
};

type PreviewItem = { type: "image" | "video"; url: string; name: string };

const STEPS = [
  { label: "Basic Info" },
  { label: "Documentation" },
  { label: "Deploy & Media" },
];

function truncateName(name: string, max = 20): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".") !== -1 ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 3;
  if (keep <= 0) return name.slice(0, max - 3) + "...";
  return base.slice(0, keep) + "..." + ext;
}

export function AddRepoDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);

  const [selectedRepo, setSelectedRepo] = useState("");
  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [userDocs, setUserDocs] = useState("");
  const [techDocs, setTechDocs] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [preview, setPreview] = useState<PreviewItem | null>(null);

  // Contributors state
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isContributor, setIsContributor] = useState<boolean | null>(null);
  const [loadingContributors, setLoadingContributors] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => setRepos([]));
  }, [open]);

  useEffect(() => {
    if (!selectedRepo) {
      setContributors([]);
      setIsContributor(null);
      return;
    }

    setLoadingContributors(true);
    fetch(`/api/github/contributors?repo=${encodeURIComponent(selectedRepo)}`)
      .then((r) => r.json())
      .then((data) => {
        setContributors(data.contributors ?? []);
        setIsContributor(data.isContributor ?? false);
      })
      .catch(() => {
        setContributors([]);
        setIsContributor(false);
      })
      .finally(() => setLoadingContributors(false));
  }, [selectedRepo]);

  const loadingRepos = open && repos === null;

  function handleClose(value: boolean) {
    setOpen(value);
    if (!value) {
      setStep(0);
      setSelectedRepo("");
      setStatus("");
      setDescription("");
      setRepoLink("");
      setDeploymentLink("");
      setUserDocs("");
      setTechDocs("");
      setEnvVars("");
      setImageFiles([]);
      setVideoFiles([]);
      setRepos(null);
      setContributors([]);
      setIsContributor(null);
      setPreview(null);
    }
  }

  function validateStep(s: number): boolean {
    if (s === 0) {
      if (!selectedRepo) { toast.error("Please select a repository."); return false; }
      if (isContributor === false) { toast.error("You are not a contributor of this repository."); return false; }
      if (!repoLink.trim()) { toast.error("Repository link is required."); return false; }
      if (!status) { toast.error("Please select a status."); return false; }
      if (!description.trim()) { toast.error("Description is required."); return false; }
    }
    if (s === 1) {
      if (!userDocs.trim()) { toast.error("User documentation is required."); return false; }
      if (!techDocs.trim()) { toast.error("Technical documentation is required."); return false; }
      if (!envVars.trim()) { toast.error("Environment variables are required."); return false; }
    }
    if (s === 2) {
      if (!deploymentLink.trim()) { toast.error("Deployment link is required."); return false; }
    }
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function addImages(files: FileList | null) {
    if (!files) return;
    setImageFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addVideos(files: FileList | null) {
    if (!files) return;
    setVideoFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeVideo(index: number) {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!validateStep(step)) return;

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

      const [imageTokens, videoTokens] = await Promise.all([
        Promise.all(imageFiles.map(uploadFile)),
        Promise.all(videoFiles.map(uploadFile)),
      ]);

      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: selectedRepo,
          status,
          description,
          repoLink,
          deploymentLink,
          userDocs,
          techDocs,
          envVars,
          imageTokens,
          videoTokens,
        }),
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

  const formDisabled = isContributor === false;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <Button className="shrink-0">Add repo</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle>Add Repository</DialogTitle>
          </DialogHeader>

          {/* Progress stepper */}
          <div className="flex items-center justify-between px-2 pt-2">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                      i < step
                        ? "bg-primary border-primary text-primary-foreground"
                        : i === step
                          ? "border-primary text-primary bg-transparent"
                          : "border-muted-foreground/30 text-muted-foreground bg-transparent"
                    )}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      i <= step ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 -mt-5 mx-1 transition-colors",
                      i < step ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="flex flex-col gap-4 py-4 min-h-70">
            {step === 0 && (
              <>
                <div className="space-y-1.5">
                  <Label>Repository name <span className="text-destructive">*</span></Label>
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

                {selectedRepo && (
                  <div className="space-y-1.5">
                    <Label>Contributors</Label>
                    {loadingContributors ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching contributors...
                      </div>
                    ) : contributors.length > 0 ? (
                      <div className="flex flex-wrap gap-2 rounded-md border bg-muted/50 p-2.5">
                        <TooltipProvider delayDuration={200}>
                          {contributors.map((c) => (
                            <Tooltip key={c.login}>
                              <TooltipTrigger asChild>
                                <Avatar className="h-7 w-7 cursor-default">
                                  {c.avatar && <AvatarImage src={c.avatar} alt={c.username ?? c.login} />}
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                                    {(c.username ?? c.login).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{c.username ?? c.login}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground p-2">No contributors found</p>
                    )}

                    {isContributor === false && !loadingContributors && (
                      <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        You are not a contributor of this repository
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="repo-link">Repository link <span className="text-destructive">*</span></Label>
                  <Input
                    id="repo-link"
                    placeholder="https://github.com/IB2B/your-repo"
                    value={repoLink}
                    onChange={(e) => setRepoLink(e.target.value)}
                    disabled={formDisabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status <span className="text-destructive">*</span></Label>
                  <Select value={status} onValueChange={setStatus} disabled={formDisabled}>
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
                  <Label htmlFor="repo-description">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="repo-description"
                    placeholder="Describe your repository..."
                    className="resize-none"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={formDisabled}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="repo-user-docs">User documentation <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="repo-user-docs"
                    placeholder="How to use this project: features, setup steps, usage instructions..."
                    className="resize-none"
                    rows={4}
                    value={userDocs}
                    onChange={(e) => setUserDocs(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="repo-tech-docs">Technical documentation <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="repo-tech-docs"
                    placeholder="For developers: architecture, tech stack, API endpoints, folder structure, how to contribute..."
                    className="resize-none"
                    rows={4}
                    value={techDocs}
                    onChange={(e) => setTechDocs(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="repo-env">.env <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="repo-env"
                    placeholder={"DATABASE_URL=\nAPI_KEY=\nNEXT_PUBLIC_APP_URL=\n..."}
                    className="resize-none font-mono text-sm"
                    rows={4}
                    value={envVars}
                    onChange={(e) => setEnvVars(e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="repo-deployment">Deployment link <span className="text-destructive">*</span></Label>
                  <Input
                    id="repo-deployment"
                    placeholder="https://your-app.com"
                    value={deploymentLink}
                    onChange={(e) => setDeploymentLink(e.target.value)}
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
                  {imageFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {imageFiles.map((file, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="gap-1.5 pr-1 cursor-pointer hover:bg-secondary/80"
                          onClick={() => setPreview({ type: "image", url: URL.createObjectURL(file), name: file.name })}
                        >
                          <ImagePlus className="h-3 w-3 shrink-0" />
                          <span className="max-w-30 truncate">{truncateName(file.name)}</span>
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
                  {videoFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {videoFiles.map((file, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="gap-1.5 pr-1 cursor-pointer hover:bg-secondary/80"
                          onClick={() => setPreview({ type: "video", url: URL.createObjectURL(file), name: file.name })}
                        >
                          <VideoIcon className="h-3 w-3 shrink-0" />
                          <span className="max-w-30 truncate">{truncateName(file.name)}</span>
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
              </>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 pt-2">
            {step === 0 ? (
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={formDisabled || loadingContributors}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add repository
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
