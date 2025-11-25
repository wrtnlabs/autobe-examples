import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationQueue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminNotificationsQueueQueueId(props: {
  admin: AdminPayload;
  queueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationQueue> {
  const notification =
    await MyGlobal.prisma.shopping_mall_notification_queue.findUnique({
      where: { id: props.queueId },
    });

  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }

  return {
    id: notification.id,
    actor_id: notification.actor_id,
    template_id: notification.template_id,
    recipient_email: notification.recipient_email,
    notification_type: notification.notification_type,
    priority: notification.priority,
    attempt_count: notification.attempt_count,
    max_attempts: notification.max_attempts,
    scheduled_at: toISOStringSafe(notification.scheduled_at),
    created_at: toISOStringSafe(notification.created_at),
  };
}
