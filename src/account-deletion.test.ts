import assert from "node:assert/strict";
import { planAccountDeletion } from "./account-deletion-policy.ts";

const plan = planAccountDeletion({
  userId: "creator-42",
  credentialId: "key-7",
  assets: [{ id: "asset-1", title: "Launch pack", status: "processing" }, { id: "asset-2", title: "Guide", status: "ready" }],
  subscribers: [{ id: "sub-1", email: "reader@example.com", status: "active" }]
}, ["session-a", "session-b"]);

assert.deepEqual(plan.sessionsToRevoke, ["session-a", "session-b"]);
assert.equal(plan.credentialToRevoke, "key-7");
assert.deepEqual(plan.contentActions, ["finish:asset-1", "archive:asset-2"]);
assert.deepEqual(plan.subscriberActions, ["notify-deletion:sub-1"]);
console.log("account deletion decision passed");
