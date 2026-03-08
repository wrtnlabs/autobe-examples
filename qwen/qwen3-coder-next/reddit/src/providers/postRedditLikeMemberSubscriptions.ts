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
import { RedditLikeSubscriptionTransformer } from "../transformers/RedditLikeSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditLikeSubscription.ICreate;
}): Promise<IRedditLikeSubscription> {
  const { member, body } = props;
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: body.reddit_like_community_id },
    });
  // Validate member exists (for consistency, though not strictly required by schema)
  const existingMember =
    await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
      where: { id: body.reddit_like_member_id },
    });
  // Validate member not already subscribed (ignore deleted records)
  const existing = await MyGlobal.prisma.reddit_like_subscriptions.findFirst({
    where: {
      reddit_like_member_id: body.reddit_like_member_id,
      reddit_like_community_id: body.reddit_like_community_id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Already subscribed to this community", 409);
  }
  // Create subscription with Collector
  const subscriptionData = await RedditLikeSubscriptionCollector.collect({
    body,
  });
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create subscription
    const subscription = await tx.reddit_like_subscriptions.create({
      data: subscriptionData,
      ...RedditLikeSubscriptionTransformer.select(),
    });
    return subscription;
  });
  // Transform response
  return await RedditLikeSubscriptionTransformer.transform(result);
}
