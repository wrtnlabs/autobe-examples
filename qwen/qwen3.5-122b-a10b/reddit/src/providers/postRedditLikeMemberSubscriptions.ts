import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunitySubscriptionCollector } from "../collectors/RedditLikeCommunitySubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunitySubscriptionTransformer } from "../transformers/RedditLikeCommunitySubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditLikeCommunitySubscription.ICreate;
}): Promise<IRedditLikeCommunitySubscription> {
  // Verify community exists and is not deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.body.communityId },
    select: { id: true, deleted_at: true },
  });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Check if member is banned from this community
  const ban = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      community_id: props.body.communityId,
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Check for duplicate subscription
  const existing =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        reddit_like_member_id: props.member.id,
        reddit_like_community_id: props.body.communityId,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Already subscribed to this community", 400);
  }
  // Create subscription
  const record =
    await MyGlobal.prisma.reddit_like_community_subscriptions.create({
      data: await RedditLikeCommunitySubscriptionCollector.collect({
        body: props.body,
        redditLikeMember: {
          id: props.member.id,
        },
      }),
      ...RedditLikeCommunitySubscriptionTransformer.select(),
    });
  return await RedditLikeCommunitySubscriptionTransformer.transform(record);
}
