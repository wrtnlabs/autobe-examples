import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserSubscriptionsSubscriptionIdNotificationPreferences(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscriptionNotifications> {
  // 1. Verify that the subscription exists, is active, belongs to user
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Subscription does not exist or not accessible",
      404,
    );
  }

  // 2. Fetch notification preferences (required for this subscription)
  const notification =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findFirst(
      {
        where: {
          user_id: props.user.id,
          community_id: subscription.community_id,
        },
      },
    );
  if (!notification) {
    throw new HttpException(
      "Notification preferences not found for this subscription",
      404,
    );
  }

  return {
    id: notification.id,
    user_id: notification.user_id,
    community_id: notification.community_id,
    notification_enabled: notification.notification_enabled,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
  };
}
