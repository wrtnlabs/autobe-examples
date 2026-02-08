import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerUserNotificationsUserNotificationId(props: {
  customer: CustomerPayload;
  userNotificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallUserNotification> {
  const notification =
    await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
      where: { id: props.userNotificationId },
      select: {
        id: true,
        notification_template_id: true,
        owner_id: true,
        owner_type: true,
        title: true,
        body: true,
        url: true,
        image_url: true,
        is_read: true,
        delivered_at: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        notificationTemplate: {
          select: {
            id: true,
            template_code: true,
            template_name: true,
            content: true,
            parameters: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }
  if (notification.owner_id !== props.customer.id) {
    throw new HttpException("Notification not found", 404);
  }
  return {
    id: notification.id,
    notification_template_id: notification.notification_template_id,
    owner_id: notification.owner_id,
    owner_type: notification.owner_type,
    title: notification.title,
    body: notification.body,
    url: notification.url === null ? null : notification.url,
    image_url: notification.image_url === null ? null : notification.image_url,
    is_read: notification.is_read,
    delivered_at:
      notification.delivered_at === null
        ? null
        : toISOStringSafe(notification.delivered_at),
    read_at:
      notification.read_at === null
        ? null
        : toISOStringSafe(notification.read_at),
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at:
      notification.deleted_at === null
        ? null
        : toISOStringSafe(notification.deleted_at),
    notificationTemplate: {
      id: notification.notificationTemplate.id,
      template_code: notification.notificationTemplate.template_code,
      template_name: notification.notificationTemplate.template_name,
      content: notification.notificationTemplate.content,
      parameters: notification.notificationTemplate.parameters,
      created_at: toISOStringSafe(notification.notificationTemplate.created_at),
      updated_at: toISOStringSafe(notification.notificationTemplate.updated_at),
      deleted_at:
        notification.notificationTemplate.deleted_at === null
          ? null
          : toISOStringSafe(notification.notificationTemplate.deleted_at),
    },
  };
}
