import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorNotificationLogsNotificationLogId(props: {
  administrator: AdministratorPayload;
  notificationLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_notification_logs.findUnique({
      where: { id: props.notificationLogId },
      select: {
        id: true,
        event_type: true,
        event_metadata: true,
        notification_template_id: true,
        user_notification_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("Notification log not found", 404);
  }
  let notificationTemplate = null;
  if (record.notification_template_id !== null) {
    notificationTemplate =
      await MyGlobal.prisma.shopping_mall_notification_templates.findUnique({
        where: { id: record.notification_template_id },
        select: {
          id: true,
          template_code: true,
          template_name: true,
          content: true,
          created_at: true,
          updated_at: true,
        },
      });
  }
  let userNotification = null;
  if (record.user_notification_id !== null) {
    userNotification =
      await MyGlobal.prisma.shopping_mall_user_notifications.findUnique({
        where: { id: record.user_notification_id },
        select: {
          id: true,
          notification_template_id: true,
          owner_id: true,
          owner_type: true,
          url: true,
          body: true,
          title: true,
          is_read: true,
          delivered_at: true,
          read_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
  }
  return {
    id: record.id,
    event_type: record.event_type,
    event_metadata: record.event_metadata,
    notification_template_id: record.notification_template_id,
    user_notification_id: record.user_notification_id,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(record.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      record.deleted_at === null
        ? null
        : (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">),
    notificationTemplate:
      notificationTemplate === null
        ? null
        : {
            id: notificationTemplate.id,
            template_code: notificationTemplate.template_code,
            template_name: notificationTemplate.template_name,
            content: notificationTemplate.content,
            created_at: toISOStringSafe(
              notificationTemplate.created_at,
            ) as string & tags.Format<"date-time">,
            updated_at: toISOStringSafe(
              notificationTemplate.updated_at,
            ) as string & tags.Format<"date-time">,
          },
    userNotification:
      userNotification === null
        ? null
        : {
            id: userNotification.id,
            notification_template_id: userNotification.notification_template_id,
            owner_id: userNotification.owner_id,
            owner_type: userNotification.owner_type,
            url: userNotification.url,
            body: userNotification.body,
            title: userNotification.title,
            is_read: userNotification.is_read,
            delivered_at:
              userNotification.delivered_at === null
                ? null
                : (toISOStringSafe(userNotification.delivered_at) as string &
                    tags.Format<"date-time">),
            read_at:
              userNotification.read_at === null
                ? null
                : (toISOStringSafe(userNotification.read_at) as string &
                    tags.Format<"date-time">),
            created_at: toISOStringSafe(userNotification.created_at) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(userNotification.updated_at) as string &
              tags.Format<"date-time">,
            deleted_at:
              userNotification.deleted_at === null
                ? null
                : (toISOStringSafe(userNotification.deleted_at) as string &
                    tags.Format<"date-time">),
          },
  };
}
