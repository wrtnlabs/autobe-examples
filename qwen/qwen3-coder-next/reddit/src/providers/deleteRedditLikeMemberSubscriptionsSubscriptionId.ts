import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the subscription to delete
  const subscription =
    await MyGlobal.prisma.reddit_like_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        reddit_like_member_id: props.member.id,
        deleted_at: null, // Only allow deleting active subscriptions
      },
    });
  if (subscription === null) {
    throw new HttpException("Subscription not found or already deleted", 404);
  }
  // Count member's active subscriptions
  const activeCount = await MyGlobal.prisma.reddit_like_subscriptions.count({
    where: {
      reddit_like_member_id: props.member.id,
      deleted_at: null,
    },
  });
  // Check minimum subscription requirement per section 270
  if (activeCount <= 1) {
    throw new HttpException("Cannot delete last subscription", 409);
  }
  // Soft-delete the subscription
  await MyGlobal.prisma.reddit_like_subscriptions.update({
    where: { id: props.subscriptionId },
    data: {
      deleted_at: new Date(),
    },
  });
}
