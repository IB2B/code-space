import { Suspense } from "react";
import { RegisterForm } from "@/components/register-from";

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
