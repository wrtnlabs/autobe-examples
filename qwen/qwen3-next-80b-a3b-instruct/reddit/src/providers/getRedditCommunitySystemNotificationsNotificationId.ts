import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunitySystemNotificationsNotificationId(props: {
  notificationId: string;
}): Promise<IRedditCommunitySystemNotification> {
  const notification =
    await MyGlobal.prisma.reddit_community_system_notifications.findUnique({
      where: { id: props.notificationId },
      select: {
        id: true,
        message: true,
        created_at: true,
        delivered_at: true,
      },
    });
  if (!notification) throw new HttpException("Notification not found", 404);
  return {
    id: notification.id,
    message: notification.message,
    created_at: toISOStringSafe(notification.created_at),
    delivered_at: notification.delivered_at
      ? toISOStringSafe(notification.delivered_at)
      : null,
  };
}
