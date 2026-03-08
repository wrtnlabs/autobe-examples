import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeSubscriptionCollector } from "../collectors/RedditLikeSubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeSubscriptionAtSummaryTransformer } from "../transformers/RedditLikeSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberCommunitiesCommunityNameSubscribe(props: {
  member: MemberPayload;
  communityName: string;
}): Promise<IRedditLikeSubscription.ISummary> {
  // Find community by name
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      name: props.communityName.toLowerCase(),
      deleted_at: null,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check if member is banned from this community
  const ban = await MyGlobal.prisma.reddit_like_bans.findFirst({
    where: {
      reddit_like_user_id: props.member.id,
      reddit_like_community_id: community.id,
      status: "active",
      deleted_at: null,
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Check if subscription already exists
  const existingSubscription =
    await MyGlobal.prisma.reddit_like_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: community.id,
        deleted_at: null,
      },
    });
  if (existingSubscription) {
    // Fetch member to include created_at
    const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
        created_at: true,
      },
    });
    return await RedditLikeSubscriptionAtSummaryTransformer.transform({
      id: existingSubscription.id,
      created_at: existingSubscription.created_at,
      updated_at: existingSubscription.updated_at,
      deleted_at: existingSubscription.deleted_at,
      status: existingSubscription.status,
      member: member,
      community: {
        id: community.id,
        created_at: community.created_at,
        name: community.name,
        icon_url: community.icon_url,
      },
    });
  }
  // Create new subscription
  const createdSubscription =
    await MyGlobal.prisma.reddit_like_subscriptions.create({
      data: await RedditLikeSubscriptionCollector.collect({
        body: {
          reddit_like_member_id: props.member.id,
          reddit_like_community_id: community.id,
          status: "subscribed",
        },
      }),
      ...RedditLikeSubscriptionAtSummaryTransformer.select(),
    });
  return await RedditLikeSubscriptionAtSummaryTransformer.transform(
    createdSubscription,
  );
}
