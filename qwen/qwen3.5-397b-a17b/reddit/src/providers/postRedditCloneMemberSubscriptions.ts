import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneSubscriptionCollector } from "../collectors/RedditCloneSubscriptionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneSubscriptionTransformer } from "../transformers/RedditCloneSubscriptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCloneSubscription.ICreate;
}): Promise<IRedditCloneSubscription> {
  // Validate community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.body.community_id },
  });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found or deleted", 404);
  }
  // Check for existing active subscription
  const existingSubscription =
    await MyGlobal.prisma.reddit_clone_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (existingSubscription !== null) {
    throw new HttpException("Subscription already exists", 409);
  }
  // Create subscription using Collector within transaction
  const [created] = await MyGlobal.prisma.$transaction(async (tx) => {
    const subscription = await tx.reddit_clone_subscriptions.create({
      data: await RedditCloneSubscriptionCollector.collect({
        body: props.body,
        redditCloneMembers: { id: props.member.id },
        redditCloneMemberSessions: { id: props.member.session_id },
      }),
      ...RedditCloneSubscriptionTransformer.select(),
    });
    // Increment subscriber count atomically
    await tx.reddit_clone_communities.update({
      where: { id: props.body.community_id },
      data: {
        subscriber_count: { increment: 1 },
      },
    });
    return [subscription];
  });
  // Transform and return using Transformer
  return await RedditCloneSubscriptionTransformer.transform(created);
}
