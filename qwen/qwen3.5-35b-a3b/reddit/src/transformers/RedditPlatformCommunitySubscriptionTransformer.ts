import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformCommunitySubscriptionTransformer {
  export type Payload =
    Prisma.reddit_platform_community_subscriptionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        subscribed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_platform_membersFindManyArgs,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            owner_id: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_platform_communitiesFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_community_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunitySubscription> {
    return {
      id: input.id,
      redditPlatformMemberId: input.member.id,
      redditPlatformCommunityId: input.community.id,
      subscribedAt: input.subscribed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: {
        email: `${input.member.username}@reddit.local`,
        password: "********",
        username: input.member.username,
        displayName: input.member.display_name,
        bio: input.member.bio ?? undefined,
      },
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description ?? undefined,
        icon_url: input.community.icon_url ?? undefined,
        subscriber_count: input.community.subscriber_count,
        author: {
          id: input.member.id,
          username: input.member.username,
          displayName: input.member.display_name,
          bio: input.member.bio ?? null,
          avatarUrl: input.member.avatar_url ?? null,
          karmaScore: input.member.karma_score,
          createdAt: input.member.created_at.toISOString(),
        },
        created_at: input.community.created_at.toISOString(),
      },
    };
  }
}
