import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminSubscriptionsSubscriptionIdNotificationPreferences(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscriptionNotifications> {
  // 1. Find subscription by ID; must not be deleted
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }

  // 2. Find notification settings for (user_id, community_id)
  const notification =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findFirst(
      {
        where: {
          user_id: subscription.user_id,
          community_id: subscription.community_id,
        },
      },
    );
  if (!notification) {
    throw new HttpException("Notification preferences not found", 404);
  }

  // 3. Return notification preferences, branding all dates to string & tags.Format<'date-time'>
  return {
    id: notification.id,
    user_id: notification.user_id,
    community_id: notification.community_id,
    notification_enabled: notification.notification_enabled,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
  };
}
