import { expect, test } from "@playwright/test";

test("admin can create, filter, resend, and revoke an invite", async ({
  page,
}) => {
  await page.goto("/");

  const inviteEmail = `playwright-${Date.now()}@example.com`;
  const emailCell = page.getByRole("cell", { name: inviteEmail });

  await page.getByLabel("Email").fill(inviteEmail);
  await page.getByLabel("Role").selectOption("admin");
  await page.getByRole("button", { name: "Send invite" }).click();

  await expect(
    page.getByText(`Created invite for ${inviteEmail}.`),
  ).toBeVisible();
  await expect(emailCell).toBeVisible();
  await expect(page.getByRole("cell", { name: "admin" }).first()).toBeVisible();
  await expect(
    page
      .getByRole("row", { name: new RegExp(inviteEmail) })
      .getByText("pending"),
  ).toBeVisible();

  await page.getByLabel("Status filter").selectOption("accepted");
  await expect(emailCell).toHaveCount(0);
  await expect(
    page.getByRole("cell", { name: "accepted.user@example.com" }),
  ).toBeVisible();

  await page.getByLabel("Status filter").selectOption("pending");
  const pendingRow = page.getByRole("row", { name: new RegExp(inviteEmail) });
  await expect(pendingRow).toBeVisible();

  await pendingRow.getByRole("button", { name: "Resend" }).click();
  await expect(
    page.getByText(`Resent invite to ${inviteEmail}.`),
  ).toBeVisible();
  await expect(
    pendingRow.getByRole("button", { name: "Resend" }),
  ).toBeVisible();
  await expect(
    pendingRow.getByRole("button", { name: "Revoke" }),
  ).toBeVisible();

  await pendingRow.getByRole("button", { name: "Revoke" }).click();
  await expect(
    page.getByText(`Revoked invite for ${inviteEmail}.`),
  ).toBeVisible();
  await expect(pendingRow).toHaveCount(0);
  await expect(
    page.getByText("No invites match the current filter."),
  ).toBeVisible();

  await page.getByLabel("Status filter").selectOption("revoked");
  const revokedRow = page.getByRole("row", { name: new RegExp(inviteEmail) });
  await expect(emailCell).toBeVisible();
  await expect(revokedRow.getByText("revoked")).toBeVisible();
  await expect(revokedRow.getByText("No actions available")).toBeVisible();
});
