"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Pencil, Loader2, ExternalLink } from "lucide-react";
import type { Repo } from "@/components/dashboard/edit-repo-dialog";

const statusLabel: Record<string, string> = {
  in_progress: "In Progress",
  done: "Completed",
  cancelled: "Cancelled",
};

export default function RepoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/repos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setRepo(null);
        } else {
          setRepo(data);
        }
      })
      .catch(() => setRepo(null))
      .finally(() => setLoading(false));
  }, [id]);

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
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{repo.repo_name}</h1>
        </div>
        <Button onClick={() => router.push(`/dashboard/repos/${id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-8">
        {/* Status */}
        <Section label="Status">
          {repo.status ? (
            <Badge
              variant={repo.status === "in_progress" ? "default" : repo.status === "cancelled" ? "destructive" : "secondary"}
              className={repo.status === "in_progress" ? "bg-blue-500 hover:bg-blue-500 text-white" : repo.status === "done" ? "bg-green-500 hover:bg-green-500 text-white" : ""}
            >
              {statusLabel[repo.status] ?? repo.status}
            </Badge>
          ) : (
            <Muted>No status</Muted>
          )}
        </Section>

        {/* Contributors */}
        <Section label="Contributors">
          {(repo.contributorsList ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {repo.contributorsList!.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
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
            <Muted>{repo.contributors || "—"}</Muted>
          )}
        </Section>

        {/* Description */}
        <Section label="Description">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{repo.description || "—"}</p>
        </Section>

        {/* Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <Section label="Repository link">
            {repo.repo_link ? (
              <a
                href={repo.repo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1.5"
              >
                {repo.repo_link}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <Muted>—</Muted>
            )}
          </Section>

          <Section label="Deployment">
            {repo.deployment ? (
              <a
                href={repo.deployment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1.5"
              >
                {repo.deployment}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <Muted>—</Muted>
            )}
          </Section>

          <Section label="Demo link">
            {repo.demo_link ? (
              <a
                href={repo.demo_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1.5"
              >
                {repo.demo_link}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <Muted>—</Muted>
            )}
          </Section>
        </div>

        {/* User Documentation */}
        <Section label="User documentation">
          {repo.user_docs ? (
            <a
              href={repo.user_docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1.5"
            >
              {repo.user_docs}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          ) : (
            <Muted>—</Muted>
          )}
        </Section>

        {/* Technical Documentation */}
        <Section label="Technical documentation">
          {repo.tech_docs ? (
            <a
              href={repo.tech_docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline break-all inline-flex items-center gap-1.5"
            >
              {repo.tech_docs}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          ) : (
            <Muted>—</Muted>
          )}
        </Section>

        {/* Environment Variables */}
        <Section label=".env">
          <pre className="text-sm whitespace-pre-wrap font-mono bg-muted rounded-md p-4">{repo.env_vars || "—"}</pre>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
