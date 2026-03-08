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

export async function postRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunitySubscription.ICreate;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunitySubscription> {
  if (props.body.confirmSubscription !== true) {
    throw new HttpException("Subscription confirmation required", 400);
  }
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const existingSubscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  await MyGlobal.prisma.reddit_platform_communities.update({
    where: {
      id: props.communityId,
    },
    data: {
      subscriber_count: { increment: 1 },
    },
  });
  const created = await RedditPlatformCommunitySubscriptionCollector.collect({
    body: {
      confirmSubscription: true,
    },
    redditPlatformMembers: {
      id: props.member.id,
    },
    redditPlatformCommunities: {
      id: props.communityId,
    },
  });
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.create({
      data: {
        id: v4(),
        reddit_platform_member_id: props.member.id as string,
        reddit_platform_community_id: props.communityId as string,
        subscribed_at: toISOStringSafe(new Date()),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
      include: {
        member: true,
        community: true,
      },
    });
  const result = await RedditPlatformCommunitySubscriptionTransformer.transform(
    {
      id: subscription.id,
      subscribed_at: subscription.subscribed_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
      deleted_at: subscription.deleted_at,
      member: {
        id: subscription.member.id,
        username: subscription.member.username,
        display_name: subscription.member.display_name,
        bio: subscription.member.bio,
        avatar_url: subscription.member.avatar_url,
        karma_score: subscription.member.karma_score,
        created_at: subscription.member.created_at,
      },
      community: {
        id: subscription.community.id,
        name: subscription.community.name,
        description: subscription.community.description,
        icon_url: subscription.community.icon_url,
        subscriber_count: subscription.community.subscriber_count,
        owner_id: subscription.community.owner_id,
        created_at: subscription.community.created_at,
      },
    } satisfies Prisma.reddit_platform_community_subscriptionsGetPayload<
      ReturnType<typeof RedditPlatformCommunitySubscriptionTransformer.select>
    >,
  );
  return result;
}
