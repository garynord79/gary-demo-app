export const inviteStatuses = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export const inviteRoles = ["member", "admin"] as const;

export type InviteStatus = (typeof inviteStatuses)[number];
export type InviteRole = (typeof inviteRoles)[number];

export type TeamInvite = {
  id: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

const EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;
const invites = new Map<string, TeamInvite>();

function now() {
  return new Date();
}

function createExpiryDate(date: Date) {
  return new Date(date.getTime() + EXPIRY_MS).toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function createToken() {
  return createId().replaceAll("-", "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sortNewestFirst(a: TeamInvite, b: TeamInvite) {
  return b.createdAt.localeCompare(a.createdAt);
}

function isExpired(invite: TeamInvite) {
  return invite.status !== "revoked" && new Date(invite.expiresAt) <= now();
}

function withDerivedStatus(invite: TeamInvite): TeamInvite {
  if (!isExpired(invite)) {
    return invite;
  }

  const expiredInvite = {
    ...invite,
    status: "expired" as const,
    updatedAt: invite.updatedAt,
  };

  invites.set(invite.id, expiredInvite);
  return expiredInvite;
}

function getInviteOrThrow(id: string) {
  const invite = invites.get(id);

  if (!invite) {
    throw new Error("Invite not found.");
  }

  return withDerivedStatus(invite);
}

export function resetInvites() {
  invites.clear();
}

export function seedAcceptedInvite() {
  const createdAt = new Date(now().getTime() - 1000 * 60 * 60).toISOString();
  const invite: TeamInvite = {
    id: createId(),
    email: "accepted.user@example.com",
    role: "member",
    status: "accepted",
    token: createToken(),
    createdAt,
    updatedAt: createdAt,
    expiresAt: createExpiryDate(new Date(createdAt)),
  };

  invites.set(invite.id, invite);
  return invite;
}

if (invites.size === 0) {
  seedAcceptedInvite();
}

export function listInvites(status?: InviteStatus | "all") {
  return [...invites.values()]
    .map(withDerivedStatus)
    .filter((invite) =>
      status && status !== "all" ? invite.status === status : true,
    )
    .sort(sortNewestFirst);
}

export function createInvite(input: { email: string; role: InviteRole }) {
  const email = normalizeEmail(input.email);

  const duplicate = [...invites.values()]
    .map(withDerivedStatus)
    .find((invite) => invite.email === email && invite.status === "pending");

  if (duplicate) {
    throw new Error("A pending invite already exists for this email.");
  }

  const timestamp = now().toISOString();
  const invite: TeamInvite = {
    id: createId(),
    email,
    role: input.role,
    status: "pending",
    token: createToken(),
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: createExpiryDate(new Date(timestamp)),
  };

  invites.set(invite.id, invite);
  return invite;
}

export function resendInvite(id: string) {
  const invite = getInviteOrThrow(id);

  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be resent.");
  }

  const updatedAt = now().toISOString();
  const nextInvite: TeamInvite = {
    ...invite,
    token: createToken(),
    updatedAt,
    expiresAt: createExpiryDate(new Date(updatedAt)),
  };

  invites.set(id, nextInvite);
  return nextInvite;
}

export function revokeInvite(id: string) {
  const invite = getInviteOrThrow(id);

  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be revoked.");
  }

  const nextInvite: TeamInvite = {
    ...invite,
    status: "revoked",
    updatedAt: now().toISOString(),
  };

  invites.set(id, nextInvite);
  return nextInvite;
}
