import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminSubscriptionsSubscriptionId(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the subscription and ensure it exists and is not already deleted.
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
    });
  if (!subscription || subscription.deleted_at !== null) {
    throw new HttpException(
      "Subscription not found or already unsubscribed",
      404,
    );
  }

  // Soft delete: set deleted_at
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_subscriptions.update({
    where: { id: props.subscriptionId },
    data: { deleted_at: deletedAt },
  });

  // Log the unsubscribe event
  await MyGlobal.prisma.community_platform_subscription_logs.create({
    data: {
      id: v4(),
      member_id: subscription.member_id,
      community_id: subscription.community_id,
      event_type: "unsubscribe",
      event_at: deletedAt,
      metadata: null,
    },
  });
}
