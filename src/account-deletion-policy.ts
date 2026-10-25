export type DeletionRequest = {
  userId: string;
  credentialId: string;
  assets: Array<{ id: string; title: string; status: "ready" | "processing" }>;
  subscribers: Array<{ id: string; email: string; status: "active" | "paused" }>;
};

export type DeletionPlan = {
  sessionsToRevoke: string[];
  credentialToRevoke: string;
  assetActions: string[];
  subscriberActions: string[];
  contentActions: string[];
};

export function planAccountDeletion(input: DeletionRequest, sessionIds: string[]): DeletionPlan {
  return {
    sessionsToRevoke: [...sessionIds],
    credentialToRevoke: input.credentialId,
    assetActions: input.assets.map((asset) => `withdraw:${asset.id}`),
    subscriberActions: input.subscribers.map((subscriber) => `notify-deletion:${subscriber.id}`),
    contentActions: input.assets.map((asset) => asset.status === "processing" ? `finish:${asset.id}` : `archive:${asset.id}`)
  };
}
