# Security audit — mesh-rsvp

Generated: **2026-05-17T13:31:04.636Z** · 16 checks · 16 pass · 0 fail

> A programmatic, CPU-only verification of every claim in the four-layer security stack.
> Re-run with `npm run audit:security` from this repo. Source: `mesh-common/tests/securityAudit.test.ts`
> This app does not render the moderator badge yet — only the shared crypto invariants are exercised. The layer-1 guarantees still apply by virtue of bundling `mesh-common`.

## Result

✅ **All checks pass.**

- crypto / Y.Doc invariants: **16 / 16**
- UI-flow checks: **0** _(this app does not yet expose the moderator UI; pass 2 skipped)_

## Checks

| ID                                 | Claim                                                                                | Method                                                                          | Result |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | :----: |
| `L1.IDENTITY.persists`             | Identity key persists across reloads via localStorage                                | loadOrCreateIdentity called twice with same prefix; both keypairs match         |   ✅   |
| `L1.IDENTITY.uniquePerApp`         | Each storagePrefix produces a distinct keypair (no cross-app reuse)                  | loadOrCreateIdentity with two different prefixes; private keys differ           |   ✅   |
| `L1.MODERATOR.claimSyncs`          | A claims moderator → B's hook reports A as current moderator                         | linkMockRooms relays Y.Doc updates; A.claim() then read on B                    |   ✅   |
| `L1.MODERATOR.expiredClaimIgnored` | A signed claim with expiresAt in the past is treated as vacant                       | Plant claim with expiresAt = now - 60s; hook reports current=null               |   ✅   |
| `L1.MODERATOR.forgedClaimRejected` | A claim with a signature not matching its embedded pubkey is treated as vacant       | Plant {pubkey:real, sig:forger}; hook rejects and reports current=null          |   ✅   |
| `L1.MODERATOR.releaseSyncs`        | Relinquish by the current moderator clears the slot for all peers                    | After A.relinquish() both A and B observe current=null                          |   ✅   |
| `L1.MODERATOR.signedClaim`         | The moderator claim's signature verifies against the embedded pubkey                 | verify({peerId,pubkey,claimedAt,expiresAt,nonce}, sig, pubkey) === true         |   ✅   |
| `L1.MODERATOR.vacantDefault`       | Fresh room reports no moderator and isMe=false                                       | useModerator hook on a fresh mock room returns {current:null, isMe:false}       |   ✅   |
| `L1.SIGN.rejectGarbage`            | Invalid signature / pubkey inputs return false instead of crashing                   | verify({x:1}, 'not-hex', 'also-bad') and verify({x:1}, '', '') both false       |   ✅   |
| `L1.SIGN.rejectTampered`           | A signed payload with any byte modified fails verification                           | Sign {msg:'hello'}, then verify({msg:'HELLO'}, …) returns false                 |   ✅   |
| `L1.SIGN.rejectWrongKey`           | A's signature does not verify under B's public key                                   | Sign with kpA.priv, verify with kpB.pub returns false                           |   ✅   |
| `L1.SIGN.roundtrip`                | A signed payload verifies against the matching pubkey                                | Ed25519 sign(payload, privkey) then verify(payload, sig, pubkey)                |   ✅   |
| `L1.TOFU.fingerprint`              | trustFingerprint emits a 4x2-hex grouped string for in-person verification           | fingerprint(peerId, pubkey) matches /^xx-xx-xx-xx$/                             |   ✅   |
| `L1.TOFU.peerIdFromPubkey`         | peerIdFromPubkey is deterministic and uses 64-bit prefix of pubkey                   | Two calls with same pubkey return the same 16-hex-char id                       |   ✅   |
| `L1.TOFU.register`                 | register() writes a self-signed PubkeyRecord into the registry Y.Map                 | Verify the stored record's signature against its own pubkey                     |   ✅   |
| `L1.TOFU.rejectImposter`           | A forged record signed by the wrong key does not block the real peer from publishing | Pre-write mallory-signed alice claim; alice arrives and overwrites with her own |   ✅   |

## Evidence

Selected captured evidence (full payloads in `security-audit.json`):

### `L1.IDENTITY.persists`

```json
{
  "pubkeyA": "766d467ad79351bd90929d5842a69abc97588707fef957926dc3a92a57328d25",
  "pubkeyB": "766d467ad79351bd90929d5842a69abc97588707fef957926dc3a92a57328d25"
}
```

### `L1.IDENTITY.uniquePerApp`

```json
{
  "pubkeyA": "a6f9fbd76cf192cb",
  "pubkeyB": "be9ba98e419ed2c0"
}
```

### `L1.MODERATOR.claimSyncs`

```json
{
  "claimer": "alice",
  "ttlMs": 1800000
}
```

### `L1.MODERATOR.expiredClaimIgnored`

```json
{
  "plantedExpiresAt": 1779024604629,
  "now": 1779024664632
}
```

### `L1.MODERATOR.forgedClaimRejected`

```json
{
  "realPubkey": "a1b9bf9d6ce94a1e",
  "forgerPubkey": "ad9b38a68db86e96"
}
```

### `L1.MODERATOR.signedClaim`

```json
{
  "sigLen": 128,
  "nonceLen": 32
}
```

### `L1.SIGN.roundtrip`

```json
{
  "sigLen": 128,
  "pubkeyPrefix": "4000edb82d040d3c"
}
```

### `L1.TOFU.fingerprint`

```json
{
  "fingerprint": "fa-d5-c1-70"
}
```

### `L1.TOFU.peerIdFromPubkey`

```json
{
  "peerId": "3f53def9410152b2"
}
```

### `L1.TOFU.register`

```json
{
  "peerId": "alice",
  "pubkeyPrefix": "72d80680da3fad1d",
  "sigLen": 128
}
```

### `L1.TOFU.rejectImposter`

```json
{
  "forgedPubkey": "dbde1a77106677cc",
  "realPubkey": "216da4a5fe0a8c3d"
}
```

---

## How to re-run

```bash
cd mesh-rsvp
npm run audit:security
```

The audit runs in two passes:

1. **Crypto invariants** (Vitest, ~1s) — sign/verify roundtrips, TOFU registry, moderator role state machine, forged-claim rejection, expired-claim rejection. Uses in-memory Yjs mock rooms; no browser.
2. **UI flow** (Playwright, ~5s) — opens two peer browsers, exercises the visible moderator badge: vacant → claim → sync → release.

Both run **headless, CPU-only**. No GPU acceleration is required; no signaling server is contacted. The fleet's `judge.sh` aggregator includes these checks alongside per-app feature tests.
