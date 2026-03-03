"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";

type UserSettings = {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar: string | null;
  github_login: string;
};

export function SettingsForm() {
  const [user, setUser] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setUser(data);
          setUsername(data.username);
        }
      })
      .catch(() => toast.error("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!username.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        body: formData,
      });

      if (res.ok) {
        toast.success("Settings saved.");
        setUser((prev) =>
          prev
            ? {
                ...prev,
                username: username.trim(),
                ...(avatarPreview && { avatar: avatarPreview }),
              }
            : prev,
        );
        setAvatarFile(null);
      } else {
        toast.error("Failed to save settings.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    user && (username.trim() !== user.username || avatarFile !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        Could not load user settings.
      </p>
    );
  }

  const initials = (user.username || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayAvatar = avatarPreview ?? user.avatar;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="h-16 w-16">
            {displayAvatar && (
              <AvatarImage src={displayAvatar} alt={user.username} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-medium text-lg">{user.username}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">@{user.github_login}</p>
            <Badge
              variant={
                user.role?.toLowerCase() === "admin" ? "default" : "secondary"
              }
              className={
                user.role?.toLowerCase() === "admin"
                  ? "bg-violet-500 hover:bg-violet-500 text-white"
                  : ""
              }
            >
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm">
            Display Name
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-muted text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Theme</Label>
          {mounted && (
            <div className="flex gap-2">
              {([
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={theme === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(value)}
                  className="cursor-pointer gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="cursor-pointer"
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
