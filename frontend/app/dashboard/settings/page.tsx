import { SettingsForm } from "@/components/dashboard/settings-form";

export default function SettingsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your profile information.
        </p>
      </div>

      <SettingsForm />
    </main>
  );
}
