"use client";

import { Button } from "@/components/ui/button";
import {
  type InviteStatus,
  inviteRoles,
  inviteStatuses,
} from "@/lib/invites/store";
import { trpc } from "@/lib/trpc/client";
import { useMemo, useState } from "react";

const filterOptions = ["all", ...inviteStatuses] as const;

type FilterValue = (typeof filterOptions)[number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: InviteStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
    case "accepted":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "revoked":
      return "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200";
    case "expired":
      return "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200";
  }
}

export function InviteManagement() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof inviteRoles)[number]>("member");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const listQuery = trpc.invites.list.useQuery({
    status: filter === "all" ? undefined : filter,
  });

  const mutationOptions = {
    onSuccess: async () => {
      await utils.invites.list.invalidate();
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    },
  };

  const createInvite = trpc.invites.create.useMutation({
    ...mutationOptions,
    onSuccess: async (invite) => {
      await utils.invites.list.invalidate();
      setEmail("");
      setRole("member");
      setFeedback(`Created invite for ${invite.email}.`);
    },
  });

  const resendInvite = trpc.invites.resend.useMutation({
    ...mutationOptions,
    onSuccess: async (invite) => {
      await utils.invites.list.invalidate();
      setFeedback(`Resent invite to ${invite.email}.`);
    },
  });

  const revokeInvite = trpc.invites.revoke.useMutation({
    ...mutationOptions,
    onSuccess: async (invite) => {
      await utils.invites.list.invalidate();
      setFeedback(`Revoked invite for ${invite.email}.`);
    },
  });

  const pendingActionId = useMemo(() => {
    if (createInvite.isPending) {
      return "create";
    }

    if (resendInvite.isPending) {
      return resendInvite.variables?.id ?? null;
    }

    if (revokeInvite.isPending) {
      return revokeInvite.variables?.id ?? null;
    }

    return null;
  }, [
    createInvite.isPending,
    resendInvite.isPending,
    resendInvite.variables?.id,
    revokeInvite.isPending,
    revokeInvite.variables?.id,
  ]);

  return (
    <section className="grid gap-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-[var(--color-primary)]">
          Admin demo
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Team invite management
        </h2>
        <p className="max-w-3xl text-[var(--color-muted-foreground)]">
          Create invites, filter by lifecycle status, and manage pending invites
          with resend or revoke actions.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Create invite</h3>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            Pending duplicates are blocked.
          </span>
        </div>
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,2fr)_180px_auto] md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setFeedback(null);
            createInvite.mutate({ email, role });
          }}
        >
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="h-10 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-base"
              name="email"
              placeholder="teammate@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Role
            <select
              className="h-10 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-base"
              name="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as (typeof inviteRoles)[number])
              }
            >
              {inviteRoles.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </label>

          <Button disabled={createInvite.isPending} type="submit">
            {createInvite.isPending ? "Creating…" : "Send invite"}
          </Button>
        </form>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Invite list</h3>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Newest invites appear first.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            Status filter
            <select
              aria-label="Status filter"
              className="h-10 rounded-md border border-[var(--color-border)] bg-transparent px-3 text-base"
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterValue)}
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option[0]?.toUpperCase()}
                  {option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm"
          >
            {feedback}
          </p>
        ) : null}

        {listQuery.isLoading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Loading invites…
          </p>
        ) : null}

        {listQuery.data?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Expires</th>
                  <th className="pb-2 pr-4 font-medium">Last updated</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.data.map((invite) => {
                  const rowBusy = pendingActionId === invite.id;
                  const canManage = invite.status === "pending";

                  return (
                    <tr
                      data-testid={`invite-row-${invite.id}`}
                      key={invite.id}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]"
                    >
                      <td className="rounded-l-xl px-4 py-3 font-medium">
                        {invite.email}
                      </td>
                      <td className="px-4 py-3">{invite.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(invite.status)}`}
                        >
                          {invite.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(invite.expiresAt)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(invite.updatedAt)}
                      </td>
                      <td className="rounded-r-xl px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canManage ? (
                            <>
                              <Button
                                disabled={rowBusy}
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setFeedback(null);
                                  resendInvite.mutate({ id: invite.id });
                                }}
                              >
                                {rowBusy &&
                                resendInvite.variables?.id === invite.id
                                  ? "Resending…"
                                  : "Resend"}
                              </Button>
                              <Button
                                disabled={rowBusy}
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setFeedback(null);
                                  revokeInvite.mutate({ id: invite.id });
                                }}
                              >
                                {rowBusy &&
                                revokeInvite.variables?.id === invite.id
                                  ? "Revoking…"
                                  : "Revoke"}
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              No actions available
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : listQuery.isLoading ? null : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No invites match the current filter.
          </p>
        )}
      </div>
    </section>
  );
}
