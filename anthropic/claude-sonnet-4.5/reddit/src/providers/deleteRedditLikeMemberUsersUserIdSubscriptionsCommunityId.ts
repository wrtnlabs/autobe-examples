import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditLikeMemberUsersUserIdSubscriptionsCommunityId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, communityId } = props;

  // Authorization: verify authenticated member matches userId
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only manage your own subscriptions",
      403,
    );
  }

  // Find the subscription to verify it exists
  const subscription =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
      where: {
        member_id: userId,
        community_id: communityId,
      },
    });

  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  // Delete the subscription
  await MyGlobal.prisma.reddit_like_community_subscriptions.delete({
    where: {
      id: subscription.id,
    },
  });
}
