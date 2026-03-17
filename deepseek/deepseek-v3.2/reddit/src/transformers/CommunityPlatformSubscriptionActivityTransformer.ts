import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformSubscriptionAtSummaryTransformer } from "./CommunityPlatformSubscriptionAtSummaryTransformer";

export namespace CommunityPlatformSubscriptionActivityTransformer {
  export type Payload =
    Prisma.community_platform_subscription_activitiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_time: true,
        posting_permission_changed: true,
        feed_inclusion_changed: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        subscription:
          CommunityPlatformSubscriptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_subscription_activitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformSubscriptionActivity> {
    return {
      id: input.id,
      eventType: input.event_type,
      eventTime: input.event_time.toISOString(),
      postingPermissionChanged: input.posting_permission_changed,
      feedInclusionChanged: input.feed_inclusion_changed,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      subscription: input.subscription
        ? await CommunityPlatformSubscriptionAtSummaryTransformer.transform(
            input.subscription,
          )
        : null,
    };
  }
}
