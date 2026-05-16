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
