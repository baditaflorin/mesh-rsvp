import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-rsvp",
  description:
    "QR-invite RSVP — a shared guest list that updates live, with no sign-up and no server",
  accentHex: "#ea580c",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
