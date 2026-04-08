import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunitySubscriptionTransformer {
  export type Payload = Prisma.reddit_like_community_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_like_member_id: true,
        reddit_like_community_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        redditLikeMember: RedditLikeMemberAtSummaryTransformer.select(),
        redditLikeCommunity: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunitySubscription> {
    return {
      id: input.id,
      redditLikeMemberId: input.reddit_like_member_id,
      redditLikeCommunityId: input.reddit_like_community_id,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.redditLikeMember,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.redditLikeCommunity,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikeCommunitySubscription;
  }
}
