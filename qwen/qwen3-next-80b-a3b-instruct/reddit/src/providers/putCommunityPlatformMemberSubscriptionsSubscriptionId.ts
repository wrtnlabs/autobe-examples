import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPlatformMemberSubscriptionsSubscriptionId(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSubscription.IUpdate;
}): Promise<ICommunityPlatformSubscription> {
  // Fetch subscription from database
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });

  // Check if subscription exists
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  // Authorization check: verify subscription belongs to authenticated user
  if (subscription.community_platform_member_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own subscriptions",
      403,
    );
  }

  // Create updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update subscription with new active status and update timestamp
  const updatedSubscription =
    await MyGlobal.prisma.community_platform_subscriptions.update({
      where: { id: props.subscriptionId },
      data: {
        active: props.body.active,
        updated_at: now,
      },
    });

  // Return updated subscription with proper type and datetime formatting
  return {
    id: updatedSubscription.id,
    member_id: updatedSubscription.community_platform_member_id,
    community_id: updatedSubscription.community_platform_communities_id,
    created_at: toISOStringSafe(updatedSubscription.created_at),
    updated_at: toISOStringSafe(updatedSubscription.updated_at),
    deleted_at: updatedSubscription.deleted_at
      ? toISOStringSafe(updatedSubscription.deleted_at)
      : undefined,
    active: updatedSubscription.active,
    metadata: undefined,
  } satisfies ICommunityPlatformSubscription;
}
