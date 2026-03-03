"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Loader2, GitFork, Clock, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";

type Developer = {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  avatar: string | null;
  totalRepos: number;
  activeRepos: number;
  completedRepos: number;
  repoNames: string[];
};

export function DevelopersTable() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [banTarget, setBanTarget] = useState<Developer | null>(null);

  useEffect(() => {
    fetch("/api/developers")
      .then((r) => r.json())
      .then((data) => setDevelopers(Array.isArray(data) ? data : []))
      .catch(() => setDevelopers([]))
      .finally(() => setLoading(false));
  }, []);

  async function applyToggle(dev: Developer, newActive: boolean) {
    setToggling(dev.id);
    setDevelopers((prev) =>
      prev.map((d) => (d.id === dev.id ? { ...d, active: newActive } : d)),
    );
    try {
      const res = await fetch(`/api/developers/${dev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      if (!res.ok) {
        setDevelopers((prev) =>
          prev.map((d) => (d.id === dev.id ? { ...d, active: dev.active } : d)),
        );
        toast.error("Failed to update access.");
      } else {
        toast.success(`${dev.username} access ${newActive ? "enabled" : "disabled"}.`);
      }
    } catch {
      setDevelopers((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, active: dev.active } : d)),
      );
      toast.error("Something went wrong.");
    } finally {
      setToggling(null);
    }
  }

  function handleToggle(dev: Developer) {
    if (dev.active) {
      // Banning — show confirmation dialog
      setBanTarget(dev);
    } else {
      // Activating — do it directly
      applyToggle(dev, true);
    }
  }

  async function confirmBan() {
    if (!banTarget) return;
    setBanTarget(null);
    await applyToggle(banTarget, false);
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Developer</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <GitFork className="h-3.5 w-3.5" />
                  Total
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Active
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Completed
                </div>
              </TableHead>
              <TableHead>Repositories</TableHead>
              <TableHead className="text-center">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : developers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No developers found.
                </TableCell>
              </TableRow>
            ) : (
              developers.map((dev) => {
                const initials = (dev.username || "")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TableRow key={dev.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {dev.avatar && <AvatarImage src={dev.avatar} alt={dev.username} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initials || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{dev.username}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {dev.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={dev.role?.toLowerCase() === "admin" ? "default" : "secondary"}
                        className={
                          dev.role?.toLowerCase() === "admin"
                            ? "bg-violet-500 hover:bg-violet-500 text-white"
                            : ""
                        }
                      >
                        {dev.role || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-sm">{dev.totalRepos ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {(dev.activeRepos ?? 0) > 0 ? (
                        <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border border-blue-200 dark:border-blue-800 dark:text-blue-400">
                          {dev.activeRepos}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(dev.completedRepos ?? 0) > 0 ? (
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/10 border border-green-200 dark:border-green-800 dark:text-green-400">
                          {dev.completedRepos}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(dev.repoNames ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(dev.repoNames ?? []).map((name) => (
                            <Badge
                              key={name}
                              variant="outline"
                              className="text-xs font-normal bg-muted/50"
                            >
                              <GitFork className="h-3 w-3 mr-1" />
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">No repos</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={dev.active}
                        disabled={toggling === dev.id}
                        onCheckedChange={() => handleToggle(dev)}
                        className={
                          dev.active
                            ? "data-[state=checked]:bg-green-500"
                            : "data-[state=unchecked]:bg-red-500"
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!banTarget} onOpenChange={(open) => { if (!open) setBanTarget(null); }}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle>Ban developer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban{" "}
              <span className="font-medium text-foreground">{banTarget?.username}</span>? They will
              no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
