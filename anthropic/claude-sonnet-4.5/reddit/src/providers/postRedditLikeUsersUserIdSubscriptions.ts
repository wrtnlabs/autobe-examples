import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeUsersUserIdSubscriptions(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.ISubscriptionCreate;
}): Promise<IRedditLikeCommunitySubscription> {
  const { member, userId, body } = props;

  // Authorization: verify userId matches authenticated member
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: Cannot subscribe on behalf of other users",
      403,
    );
  }

  // Validate community exists and is accessible
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: body.community_id },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.deleted_at !== null) {
    throw new HttpException("Cannot subscribe to deleted community", 400);
  }

  if (community.is_archived) {
    throw new HttpException("Cannot subscribe to archived community", 400);
  }

  // Check privacy type - reject private communities
  if (community.privacy_type === "private") {
    throw new HttpException(
      "Private communities require approval. Please request to join.",
      400,
    );
  }

  // Check for existing subscription
  const existingSubscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        community_id: body.community_id,
        member_id: member.id,
      },
    });

  if (existingSubscription) {
    throw new HttpException("Already subscribed to this community", 409);
  }

  // Prepare values for subscription creation
  const subscriptionId = v4() as string & tags.Format<"uuid">;
  const subscribedAt = toISOStringSafe(new Date());

  // Create subscription
  await MyGlobal.prisma.reddit_like_community_subscriptions.create({
    data: {
      id: subscriptionId,
      community_id: body.community_id,
      member_id: member.id,
      subscribed_at: subscribedAt,
    },
  });

  // Increment community subscriber_count
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: body.community_id },
    data: {
      subscriber_count: community.subscriber_count + 1,
    },
  });

  // Return subscription record using prepared values
  return {
    id: subscriptionId,
    community_id: body.community_id,
    member_id: member.id,
    subscribed_at: subscribedAt,
  };
}
