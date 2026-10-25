import { z } from "zod";
import { InfraiClient } from "./infrai-client.ts";
import { planAccountDeletion, type DeletionRequest } from "./account-deletion-policy.ts";

// Capability represented by the client call below: infrai.auth.session.revoke

const requestSchema = z.object({
  userId: z.string().min(1),
  credentialId: z.string().min(1),
  assets: z.array(z.object({ id: z.string(), title: z.string(), status: z.enum(["ready", "processing"]) })),
  subscribers: z.array(z.object({ id: z.string(), email: z.string().email(), status: z.enum(["active", "paused"]) }))
});

export async function deleteCreatorAccount(rawBody: unknown, client = new InfraiClient()) {
  const input = requestSchema.parse(rawBody) as DeletionRequest;
  const sessions = await client.listSessions(input.userId);
  const plan = planAccountDeletion(input, sessions.map((session) => session.id));
  for (const sessionId of plan.sessionsToRevoke) await client.revokeSession(sessionId);
  await client.revokeCredential(plan.credentialToRevoke);
  return { userId: input.userId, revokedSessions: plan.sessionsToRevoke, revokedCredential: plan.credentialToRevoke, assetActions: plan.assetActions, subscriberActions: plan.subscriberActions, contentActions: plan.contentActions };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = JSON.parse(process.env.ACCOUNT_DELETION_JSON ?? "{}");
  const result = await deleteCreatorAccount(body);
  console.log(JSON.stringify(result, null, 2));
}
