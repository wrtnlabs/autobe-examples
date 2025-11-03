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

export async function putCommunityPlatformUserSubscriptionsSubscriptionIdNotificationPreferences(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscriptionNotifications.IUpdate;
}): Promise<ICommunityPlatformCommunitySubscriptionNotifications> {
  const { user, subscriptionId, body } = props;
  const notification =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findUnique(
      {
        where: { id: subscriptionId },
      },
    );
  if (!notification) {
    throw new HttpException("Notification preferences not found", 404);
  }
  if (notification.user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You do not own this subscription notification preferences",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.update(
      {
        where: { id: subscriptionId },
        data: {
          notification_enabled: body.notification_enabled,
          updated_at: now,
        },
      },
    );
  return {
    id: updated.id,
    user_id: updated.user_id,
    community_id: updated.community_id,
    notification_enabled: updated.notification_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
