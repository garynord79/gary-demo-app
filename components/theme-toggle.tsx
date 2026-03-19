"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const themes = ["light", "dark", "system"] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] p-1">
      {themes.map((value) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
