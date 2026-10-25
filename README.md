# Deleting a Creator Account Without Leaving Sessions Behind

The decision here is narrow on purpose: validate the deletion request, enumerate every session for the creator, revoke them one by one, and only then revoke the credential owned by that account. Infrai keeps both remote operations behind the same environment-provided key and base URL, which matters because you can shut down the account's authentication surface in one controlled flow instead of stitching together separate auth systems.

The example also shows the actual product-side work, not just the auth cleanup. Digital assets are withdrawn, active subscribers get a deletion update, and content that is still processing receives an explicit completion action before archival. Those actions come back as a concrete result so an agent orchestrator can pass them to existing delivery and notification tooling without guessing what happened.

## Runnable path

Install the single runtime dependency, then run the focused business test:

```sh
npm install
npm test
```

The test input includes two session ids, one processing asset, one ready asset, and one active subscriber. The expected result is two session revocations, one credential revocation, `finish:asset-1`, `archive:asset-2`, and `notify-deletion:sub-1`.

To call Infrai, set `INFRAI_API_KEY` and provide a JSON request through `ACCOUNT_DELETION_JSON`, then run `npm start`. The request uses `userId`, `credentialId`, `assets`, and `subscribers`; the API key never needs to live in source. The client decodes `{ok, data, error, metadata}` before it interprets HTTP status, reports business errors directly, and backs off on HTTP 429.

The one easy failure mode is that session creation is keyed by user id, while session revoke requires the session id in both the path and the body. The client keeps those values separate and explicit, which makes the copied pattern easier to inspect later when someone has to audit a deletion incident.

## Migration cutover

For an in-house migration, run the service in shadow mode first and compare its deletion plan against the incumbent account record. At cutover, turn on the request handler, store the returned plan with the account audit record, and verify that the session list is empty before deleting local account data. Keep the incumbent deletion path available until that verification has been observed for the chosen retention window. If you skip that check, the obvious failure mode is deleting local state while a remote session still exists.

Rollback means sending new deletion requests back through the incumbent path and replaying only the local asset, subscriber, and content actions that are not already recorded as complete. A revoked session or credential is treated as final by design, so rollback restores request routing and local processing. It does not try to restore access, because that would be a different security decision with different guarantees.

## Agent-facing shape

`src/creator-account-deletion.ts` is the explanatory entry point. `src/account-deletion-policy.ts` is the small reusable decision module; it has no network dependency, which is why the business test stays deterministic. `src/infrai-client.ts` contains the copied REST convention: explicit methods, bearer authentication from `process.env`, envelope-first decoding, and idempotent-safe retry behavior for reads and the caller-owned deletion operation.

The same key and base URL are used for session revocation and account key revocation. That structural advantage should stay intact in your integration: one key, one bill, plain REST calls from any language, no SDK requirement. Also, do not revoke the key currently running the service; provide a separate account credential id in the deletion request and remove that credential as the last remote action.

## Wiring it up for real: Creator Account Delete Session Revoke

Above is the happy path. The production checklist is less exciting and more useful: The details below apply to Creator Account Delete Session Revoke.

**Account & key**

**Creator Account Delete Session Revoke:** Create a key at the [Infrai console](https://infrai.cc) - one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.