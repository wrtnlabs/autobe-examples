import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunitySubscriptionCollector } from "../collectors/RedditPlatformCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionTransformer } from "../transformers/RedditPlatformCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityIdSubscribe(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunitySubscription.ICreate;
}): Promise<IRedditPlatformCommunitySubscription> {
  // Verify community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Begin transaction for atomic subscription creation and count increment
  const created = await MyGlobal.prisma.$transaction(
    async (tx) => {
      // Attempt to create subscription record
      // Unique constraint: (reddit_platform_member_id, reddit_platform_community_id)
      const subscription =
        await tx.reddit_platform_community_subscriptions.create({
          data: await RedditPlatformCommunitySubscriptionCollector.collect({
            body: props.body,
            redditPlatformMembers: {
              id: props.member.id,
            },
            redditPlatformCommunities: {
              id: props.communityId,
            },
          }),
          include: {
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
            },
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
            },
          },
        });
      // Increment community subscriber count
      await tx.reddit_platform_communities.update({
        where: {
          id: props.communityId,
        },
        data: {
          subscriber_count: {
            increment: 1,
          },
        },
      });
      return subscription;
    },
    {
      maxWait: 2000,
      timeout: 5000,
    },
  );
  // Handle unique constraint violation (duplicate subscription)
  if (created === null) {
    throw new HttpException("Already subscribed", 409);
  }
  // Transform database record to API response using transformer
  return await RedditPlatformCommunitySubscriptionTransformer.transform(
    created,
  );
}
