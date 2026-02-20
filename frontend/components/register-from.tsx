"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerUser } from "@/services/authService";

export function RegisterForm() {
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerUser({ fullName, role, email, password });
      toast.success("Account created successfully!");
    } catch (error: unknown) {
        console.log(error);
        
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center font-sans tracking-tighter justify-center bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-1 px-4"
      >
        <div className="text-center">
          <h1 className="text-lg font-medium tracking-tight">Register Now!</h1>
          <p className="text-xs text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs text-muted-foreground">
            Full Name
          </Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            type="text"
            className="bg-muted"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="role" className="text-xs text-muted-foreground">
            Role
          </Label>
          <Select onValueChange={setRole} value={role}>
            <SelectTrigger className="w-full bg-muted">
              <SelectValue placeholder="your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup className="font-sans">
                <SelectItem value="Owner">Owner</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-muted-foreground">
            Email address
          </Label>
          <Input
            id="email"
            placeholder="you@example.com"
            type="email"
            className="bg-muted"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            className="bg-muted"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? "Registering..." : "Register"}
          </Button>
        </div>
      </form>
    </div>
  );
}
