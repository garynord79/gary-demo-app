import { InviteManagement } from "@/components/invite-management";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Starter scaffold demo
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Next.js + tRPC + Drizzle
          </h1>
          <p className="max-w-2xl text-[var(--color-muted-foreground)]">
            An admin-facing invite workflow with resilient UI controls and
            end-to-end coverage for the main happy path.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <InviteManagement />
    </main>
  );
}
