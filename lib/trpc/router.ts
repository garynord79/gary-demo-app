import { createTRPCRouter, publicProcedure } from "@/lib/trpc/init";
import { z } from "zod";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),
  greeting: publicProcedure
    .input(
      z
        .object({
          name: z.string().min(1).default("world"),
        })
        .optional(),
    )
    .query(({ input }) => ({ message: `Hello, ${input?.name ?? "world"}!` })),
});

export type AppRouter = typeof appRouter;
