import {
  resetInvites,
  seedAcceptedInvite,
  seedInvite,
} from "@/lib/invites/store";
import { appRouter } from "@/lib/trpc/router";
import { describe, expect, it } from "vitest";

describe("appRouter", () => {
  it("returns a health payload", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.health()).resolves.toMatchObject({ status: "ok" });
  });

  it("creates, filters, resends, and revokes invites", async () => {
    resetInvites();
    seedAcceptedInvite();

    const caller = appRouter.createCaller({});
    const createdInvite = await caller.invites.create({
      email: "Teammate@example.com",
      role: "admin",
    });

    expect(createdInvite.email).toBe("teammate@example.com");
    expect(createdInvite.status).toBe("pending");

    await expect(
      caller.invites.create({
        email: "teammate@example.com",
        role: "member",
      }),
    ).rejects.toThrow(/pending invite already exists/i);

    const pendingInvites = await caller.invites.list({ status: "pending" });
    expect(pendingInvites).toHaveLength(1);
    expect(pendingInvites[0]?.id).toBe(createdInvite.id);

    const resentInvite = await caller.invites.resend({ id: createdInvite.id });
    expect(resentInvite.updatedAt >= createdInvite.updatedAt).toBe(true);
    expect(resentInvite.token).not.toBe(createdInvite.token);

    const revokedInvite = await caller.invites.revoke({ id: createdInvite.id });
    expect(revokedInvite.status).toBe("revoked");

    const revokedInvites = await caller.invites.list({ status: "revoked" });
    expect(revokedInvites.map((invite) => invite.id)).toContain(
      createdInvite.id,
    );
  });

  it("accepted invite with past expiry date is not re-derived as expired", async () => {
    resetInvites();

    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    const seeded = seedInvite({
      status: "accepted",
      expiresAt: pastExpiry,
    });

    const caller = appRouter.createCaller({});
    const all = await caller.invites.list();
    const found = all.find((invite) => invite.id === seeded.id);

    expect(found).toBeDefined();
    expect(found?.status).toBe("accepted");
  });
});
