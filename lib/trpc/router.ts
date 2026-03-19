import {
  createInvite,
  inviteRoles,
  inviteStatuses,
  listInvites,
  resendInvite,
  revokeInvite,
} from "@/lib/invites/store";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const inviteStatusSchema = z.enum(inviteStatuses);
const inviteRoleSchema = z.enum(inviteRoles);

function wrapInviteError(error: unknown) {
  if (error instanceof Error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

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
  invites: createTRPCRouter({
    list: publicProcedure
      .input(
        z
          .object({
            status: inviteStatusSchema.optional(),
          })
          .nullish(),
      )
      .query(({ input }) => listInvites(input?.status)),
    create: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email(),
          role: inviteRoleSchema,
        }),
      )
      .mutation(({ input }) => {
        try {
          return createInvite(input);
        } catch (error) {
          wrapInviteError(error);
        }
      }),
    resend: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .mutation(({ input }) => {
        try {
          return resendInvite(input.id);
        } catch (error) {
          wrapInviteError(error);
        }
      }),
    revoke: publicProcedure
      .input(
        z.object({
          id: z.string().uuid(),
        }),
      )
      .mutation(({ input }) => {
        try {
          return revokeInvite(input.id);
        } catch (error) {
          wrapInviteError(error);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
