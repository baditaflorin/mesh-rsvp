import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-rsvp",
  description: "QR-invite RSVP — live attendance forecast and dietary tallies",
  accentHex: "#ea580c",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
