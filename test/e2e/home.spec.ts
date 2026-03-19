import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /next\.js \+ trpc \+ drizzle/i }),
  ).toBeVisible();
});
