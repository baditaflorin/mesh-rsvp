import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("A says going +2; B sees 3 attending", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // The in-app help explains the core "two tabs, same room, live" model.
    await expect(a.getByText(/Everyone in the same room sees replies update live/i)).toBeVisible();
    // RSVP buttons are gated on a name — the hint must tell the user why.
    await expect(a.getByText("Enter your name to reply.")).toBeVisible();

    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("+1s").fill("2");
    await a.getByPlaceholder("dietary (e.g. vegetarian, no nuts)").fill("vegetarian");
    await a.getByRole("button", { name: "✓ going", exact: true }).click();

    await expect(b.locator(".viral-status").first()).toContainText("3 attending");
    await expect(b.locator(".rsvp-list em")).toContainText("vegetarian");
  } finally {
    await cleanup();
  }
});

// The ADVERTISED core action, asserted on the OPPOSITE peer + the dedicated
// "dietary breakdown" tally section (which the test above never touched):
// peer B RSVPs *yes* with a dietary tag -> peer A's live forecast count AND
// the dietary tally must update on screen. This is the advertised
// "live attendance forecast and dietary tallies".
test("peer B RSVPs yes + dietary -> peer A's forecast count and dietary tally update", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Nobody has replied yet — forecast 0, no dietary breakdown section.
    await expect(a.locator(".viral-status").first()).toContainText("0 attending");
    await expect(a.getByRole("heading", { name: "dietary breakdown" })).toHaveCount(0);

    // Peer B RSVPs YES with two dietary tags and a +1.
    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("+1s").fill("1");
    await b.getByPlaceholder("dietary (e.g. vegetarian, no nuts)").fill("vegan, gluten-free");
    await b.getByRole("button", { name: "✓ going", exact: true }).click();

    // ASSERT CROSS-PEER on A (who never replied): forecast counts B + the +1.
    await expect(a.locator(".viral-status").first()).toContainText("2 attending");
    await expect(a.locator(".viral-status").first()).toContainText("1 yes");

    // ASSERT the dietary TALLY breakdown appeared on A and tallies both tags.
    await expect(a.getByRole("heading", { name: "dietary breakdown" })).toBeVisible();
    const aTags = a.locator(".viral-tags li");
    await expect(aTags.filter({ hasText: "vegan" })).toContainText("vegan: 1");
    await expect(aTags.filter({ hasText: "gluten-free" })).toContainText("gluten-free: 1");

    // Peer A also RSVPs vegan -> the vegan tally must increment to 2 on BOTH.
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("dietary (e.g. vegetarian, no nuts)").fill("vegan");
    await a.getByRole("button", { name: "✓ going", exact: true }).click();

    await expect(a.locator(".viral-tags li").filter({ hasText: "vegan" })).toContainText(
      "vegan: 2",
    );
    await expect(b.locator(".viral-tags li").filter({ hasText: "vegan" })).toContainText(
      "vegan: 2",
    );
    // Forecast on B now reflects alice (1) + bob (1) + bob's +1 = 3.
    await expect(b.locator(".viral-status").first()).toContainText("3 attending");
  } finally {
    await cleanup();
  }
});
