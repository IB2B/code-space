"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/services/authService";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "not_owner" || error === "not_member") {
      toast.error("Access denied. You must be a member of the organization.");
    } else if (error === "not_active") {
      toast.error("Your account is pending admin approval. Please contact an administrator.");
    } else if (error === "oauth_failed") {
      toast.error("GitHub login failed. Please try again.");
    }
  }, [searchParams]);

  const handleGithubLogin = () => {
    window.location.href = "/api/auth/login";
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser({ email, password });
      window.location.href = "/dashboard";
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center font-sans tracking-tighter justify-center bg-background">
      <div className="absolute top-4 right-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && (resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-1 px-4">
        <div className="text-center">
          <h1 className="text-lg font-medium tracking-tight">Welcome Back!</h1>
          <p className="text-xs text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Button
            type="button"
            onClick={handleGithubLogin}
            className="h-11 w-full shadow-none cursor-pointer bg-neutral-900 text-neutral-50 border-0 hover:bg-neutral-800 transition-colors duration-200 ease flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.288 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.43 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z" />
            </svg>
            Login in with GitHub
          </Button>

          <div className="relative flex items-center justify-center">
            <span className="text-xs text-muted-foreground">or</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              Email address
            </Label>
            <Input
              id="email"
              placeholder="you@example.com"
              type="email"
              className="bg-muted text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              className="bg-muted text-foreground"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
