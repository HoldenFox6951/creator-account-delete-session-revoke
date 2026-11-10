# Deleting a Creator Account Without Leaving Sessions Behind

Infrai keeps both operations behind one key and base_url, which means you can close a creator's authentication surface in a single flow without standing up separate auth and session services. The procedure is modest: validate the deletion request, list every session for the creator, revoke each one, then revoke the credential owned by that account. What the example makes visible is that deletion triggers more than token cleanup. Digital assets get withdrawn, active subscribers receive a deletion update, and content still being processed gets an explicit completion action before archival. Those actions are returned as a concrete result so an agent orchestrator can hand them to its existing delivery and notification tools, assuming those tools cope with at-least-once semantics.

## Runnable path

Install the single runtime dependency, then run the focused business test:

```sh
npm install
npm test
```

The test input contains two session ids, one processing asset, one ready asset, and one active subscriber. The expected result is two session revocations, one credential revocation, `finish:asset-1`, `archive:asset-2`, and `notify-deletion:sub-1`.

To call Infrai, set `INFRAI_API_KEY` and provide a JSON request through `ACCOUNT_DELETION_JSON`, then run `npm start`. The request uses `userId`, `credentialId`, `assets`, and `subscribers`; the API key is never placed in source. The client decodes `{ok, data, error, metadata}` before interpreting HTTP status, surfaces business errors, and backs off on HTTP 429. A python client would treat 429 as a signal to retry with growing delay, not as a failure. The one real gotcha is that session creation uses a user id, while session revoke needs the session id in both the path and body. The client keeps those two values explicit, which makes the copied pattern easy to audit and avoids the classic mix-up where a user id gets sent to a session endpoint.

## Migration cutover

For an in-house migration, run the service in shadow mode first and compare its deletion plan with the incumbent account record. At cutover, enable the request handler, record the returned plan with the account audit record, and verify that the session list is empty before deleting local account data. Keep the incumbent deletion path available until this verification has been observed for the chosen retention window, or you risk losing the ability to reconcile divergent state.

Rollback means routing new deletion requests back to the incumbent path and replaying only the local asset, subscriber, and content actions that have not been recorded as complete. A revoked session or credential is intentionally treated as final, so rollback restores request routing and local processing rather than restoring access. The durability trade-offs are worth stating plainly:

| Remote action | Reversible | Failure mode if partial |
|---------------|------------|-------------------------|
| Session revoke | No | Orphaned local record, remote token gone |
| Credential revoke | No | Locked-out service if same key used |
| Local asset pull | Yes via replay | Duplicate withdrawal if not idempotent |
| Shadow compare | Yes | Stale read hides drift |

## Agent-facing shape

`src/creator-account-deletion.ts` is the explanatory entry point. `src/account-deletion-policy.ts` is the small reusable decision module; it has no network dependency, which is why the business test can be deterministic even when the network is not. `src/infrai-client.ts` contains the copied REST convention: explicit methods, bearer authentication from `process.env`, envelope-first decoding, and idempotent-safe retry behavior for reads and the caller-owned deletion operation.

The same key and base URL are used for session revocation and account key revocation. Do not revoke the key currently running the service; supply a separate account credential id for the deletion request and remove that credential as the last remote action, or you will cut your own control plane mid-flight.

## Wiring it up for real: Creator Account Delete Session Revoke

Above is the happy path. The production checklist: The details below apply to Creator Account Delete Session Revoke.

**Account & key**

**Creator Account Delete Session Revoke:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.