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

export async function postRedditLikeMemberUsersUserIdSubscriptions(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeUser.ISubscriptionCreate;
}): Promise<IRedditLikeCommunitySubscription> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own subscriptions",
      403,
    );
  }

  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: body.community_id,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.is_archived) {
    throw new HttpException("Cannot subscribe to archived community", 400);
  }

  const existingSubscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        community_id: body.community_id,
        member_id: userId,
      },
    });

  if (existingSubscription) {
    return {
      id: existingSubscription.id,
      community_id: existingSubscription.community_id,
      member_id: existingSubscription.member_id,
      subscribed_at: toISOStringSafe(existingSubscription.subscribed_at),
    };
  }

  const subscriptionId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const subscribedAtString = toISOStringSafe(now);

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_like_community_subscriptions.create({
      data: {
        id: subscriptionId,
        community_id: body.community_id,
        member_id: userId,
        subscribed_at: now,
      },
    });

    await tx.reddit_like_communities.update({
      where: { id: body.community_id },
      data: {
        subscriber_count: {
          increment: 1,
        },
      },
    });
  });

  return {
    id: subscriptionId,
    community_id: body.community_id,
    member_id: userId,
    subscribed_at: subscribedAtString,
  };
}
