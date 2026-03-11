import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_like_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_like_membersFindFirstArgs,
        posts: {
          select: { id: true },
        } satisfies Prisma.reddit_like_postsFindManyArgs,
        subscriptions: {
          select: { id: true },
        } satisfies Prisma.reddit_like_subscriptionsFindManyArgs,
        moderatorRoles: {
          select: { id: true },
        } satisfies Prisma.reddit_like_moderator_rolesFindManyArgs,
        userBans: {
          select: { id: true },
        } satisfies Prisma.reddit_like_bansFindManyArgs,
        _count: {
          select: {
            posts: true,
            subscriptions: true,
            moderatorRoles: true,
            userBans: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity> {
    return {
      id: input.id,
      name: input.name,
      icon_url: input.icon_url ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      subscriber_count: input._count.subscriptions,
      owner: await RedditLikeMemberAtSummaryTransformer.transform(input.owner),
      posts_count: input._count.posts,
      subscription_count: input._count.subscriptions,
      moderatorRole_count: input._count.moderatorRoles,
      userBan_count: input._count.userBans,
    };
  }
}
