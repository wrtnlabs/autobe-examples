import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotification";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function getEconPoliticalForumRegisteredUserNotificationsNotificationId(props: {
  registeredUser: RegistereduserPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumNotification> {
  const { registeredUser, notificationId } = props;

  // Fetch the notification by id
  const notification =
    await MyGlobal.prisma.econ_political_forum_notifications.findUnique({
      where: { id: notificationId },
    });

  // Not found
  if (!notification) {
    throw new HttpException("Not Found", 404);
  }

  // If soft-deleted, treat as not found for regular recipients
  if (notification.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the recipient may access their notification
  if (notification.registereduser_id !== registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Map DB record to API DTO, converting Date -> ISO strings and null -> undefined
  return {
    id: notification.id,
    registereduser_id: notification.registereduser_id,
    actor_registereduser_id: notification.actor_registereduser_id ?? undefined,
    type: notification.type,
    title: notification.title ?? undefined,
    body: notification.body ?? undefined,
    payload: notification.payload,
    is_read: notification.is_read,
    delivered_at: notification.delivered_at
      ? toISOStringSafe(notification.delivered_at)
      : undefined,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : undefined,
    related_thread_id: notification.related_thread_id ?? undefined,
    related_post_id: notification.related_post_id ?? undefined,
    related_moderation_case_id:
      notification.related_moderation_case_id ?? undefined,
  };
}
