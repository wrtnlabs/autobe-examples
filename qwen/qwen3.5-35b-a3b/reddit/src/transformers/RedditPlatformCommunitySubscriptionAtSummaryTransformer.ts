import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunitySubscriptionAtSummaryTransformer {
  export type Payload =
    Prisma.reddit_platform_community_subscriptionsGetPayload<{
      select: {
        id: true;
        subscribed_at: true;
        created_at: true;
        updated_at: true;
        deleted_at: true;
        member: ReturnType<
          typeof RedditPlatformMemberAtSummaryTransformer.select
        >;
        community: ReturnType<
          typeof RedditPlatformCommunityAtSummaryTransformer.select
        >;
      };
    }>;
  export function select() {
    return {
      select: {
        id: true,
        subscribed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunitySubscription.ISummary> {
    return {
      id: input.id,
      subscribed_at: input.subscribed_at.toISOString(),
      member: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
