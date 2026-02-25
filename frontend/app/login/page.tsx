import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="font-sans tracking-tight">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
