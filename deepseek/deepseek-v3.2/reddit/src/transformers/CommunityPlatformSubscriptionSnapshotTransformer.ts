import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformSubscriptionAtSummaryTransformer } from "./CommunityPlatformSubscriptionAtSummaryTransformer";

export namespace CommunityPlatformSubscriptionSnapshotTransformer {
  export type Payload =
    Prisma.community_platform_subscription_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_subscription_id: true,
        community_id: true,
        user_id: true,
        status: true,
        posting_permission_granted: true,
        feed_included: true,
        subscribed_at: true,
        unsubscribed_at: true,
        created_at: true,
        subscription:
          CommunityPlatformSubscriptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_subscription_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSubscriptionSnapshot> {
    return {
      id: input.id,
      community_platform_subscription_id:
        input.community_platform_subscription_id,
      community_id: input.community_id,
      user_id: input.user_id,
      status: input.status,
      posting_permission_granted: input.posting_permission_granted,
      feed_included: input.feed_included,
      subscribed_at: input.subscribed_at?.toISOString() ?? null,
      unsubscribed_at: input.unsubscribed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      subscription:
        await CommunityPlatformSubscriptionAtSummaryTransformer.transform(
          input.subscription,
        ),
    };
  }
}
