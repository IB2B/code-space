"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Loader2, ArrowLeft } from "lucide-react";
import type { Repo } from "@/components/dashboard/edit-repo-dialog";

export default function RepoEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("");
  const [description, setDescription] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [demoLink, setDemoLink] = useState("");
  const [userDocs, setUserDocs] = useState("");
  const [techDocs, setTechDocs] = useState("");
  const [envVars, setEnvVars] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/repos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setRepo(null);
        } else {
          setRepo(data);
          setStatus(data.status ?? "");
          setDescription(data.description ?? "");
          setRepoLink(data.repo_link ?? "");
          setDeploymentLink(data.deployment ?? "");
          setDemoLink(data.demo_link ?? "");
          setUserDocs(data.user_docs ?? "");
          setTechDocs(data.tech_docs ?? "");
          setEnvVars(data.env_vars ?? "");
        }
      })
      .catch(() => setRepo(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit() {
    if (!repo) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, description, repoLink, deploymentLink, demoLink, userDocs, techDocs, envVars }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update repository.");
        return;
      }

      toast.success("Repository updated successfully!");
      router.push(`/dashboard/repos/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
        <p className="text-muted-foreground">Repository not found</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/repos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/repos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {repo.repo_name}</h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* Read-only fields */}
        <div className="space-y-1.5">
          <Label>Repository name</Label>
          <Input value={repo.repo_name} readOnly className="bg-muted text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <Label>Contributors</Label>
          <div className="flex flex-wrap gap-2 rounded-md border bg-muted p-2.5 min-h-9">
            {(repo.contributorsList ?? []).length > 0
              ? repo.contributorsList!.map((c) => (
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
              : <span className="text-sm text-muted-foreground">{repo.contributors || "—"}</span>
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
          <Label htmlFor="edit-demo-link">Demo link</Label>
          <Input
            id="edit-demo-link"
            placeholder="https://demo.your-app.com"
            value={demoLink}
            onChange={(e) => setDemoLink(e.target.value)}
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
          <Label htmlFor="edit-user-docs">User documentation link</Label>
          <Input
            id="edit-user-docs"
            placeholder="https://docs.example.com/user-guide"
            value={userDocs}
            onChange={(e) => setUserDocs(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-tech-docs">Technical documentation link</Label>
          <Input
            id="edit-tech-docs"
            placeholder="https://docs.example.com/technical"
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
            rows={5}
            value={envVars}
            onChange={(e) => setEnvVars(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 pb-8">
          <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard/repos")}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
