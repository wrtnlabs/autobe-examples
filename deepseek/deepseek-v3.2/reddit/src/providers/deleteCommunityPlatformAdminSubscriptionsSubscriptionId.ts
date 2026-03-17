import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminSubscriptionsSubscriptionId(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: { id: props.subscriptionId },
      select: {
        id: true,
        member_id: true,
        community_id: true,
        active: true,
        deleted_at: true,
        created_at: true, // Added missing field
        member: { select: { id: true } },
        community: { select: { id: true } },
      },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  if (subscription.deleted_at !== null) {
    throw new HttpException("Subscription already deleted", 400);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_subscription_snapshots.create({
      data: {
        id: v4(),
        community_platform_subscription_id: subscription.id,
        user_id: subscription.member_id,
        community_id: subscription.community_id,
        status: subscription.active ? "active" : "inactive",
        posting_permission_granted: subscription.active,
        feed_included: subscription.active,
        subscribed_at: toISOStringSafe(subscription.created_at), // Use toISOStringSafe
        unsubscribed_at: now,
        created_at: now,
      },
    });
    await tx.community_platform_subscription_activities.create({
      data: {
        id: v4(),
        member_id: subscription.member_id,
        community_id: subscription.community_id,
        subscription_id: subscription.id,
        event_type: "unsubscribed",
        event_time: now,
        posting_permission_changed: true,
        feed_inclusion_changed: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.community_platform_subscriptions.update({
      where: { id: props.subscriptionId },
      data: {
        active: false,
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
