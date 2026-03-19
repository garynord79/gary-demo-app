import { appRouter } from "@/lib/trpc/router";
import { describe, expect, it } from "vitest";

describe("appRouter", () => {
  it("returns a health payload", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.health()).resolves.toMatchObject({ status: "ok" });
  });
});
