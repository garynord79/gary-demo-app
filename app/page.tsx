import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Starter scaffold
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Next.js + tRPC + Drizzle
          </h1>
        </div>
        <ThemeToggle />
      </div>

      <section className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
        <p className="max-w-2xl text-[var(--color-muted-foreground)]">
          Includes pnpm, Biome, Vitest, Playwright, TanStack Query,
          shadcn/ui-ready components, Drizzle ORM, and a blob storage adapter
          abstraction.
        </p>
        <div className="flex gap-3">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary action</Button>
        </div>
      </section>
    </main>
  );
}
