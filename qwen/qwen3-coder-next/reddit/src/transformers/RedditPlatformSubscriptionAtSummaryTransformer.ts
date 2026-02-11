import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformSubscriptionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformSubscription.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
