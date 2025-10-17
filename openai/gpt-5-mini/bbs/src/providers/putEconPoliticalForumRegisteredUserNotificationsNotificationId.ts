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

export async function putEconPoliticalForumRegisteredUserNotificationsNotificationId(props: {
  registeredUser: RegistereduserPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumNotification.IUpdate;
}): Promise<IEconPoliticalForumNotification> {
  const { registeredUser, notificationId, body } = props;

  // Fetch and verify existence
  const notification =
    await MyGlobal.prisma.econ_political_forum_notifications.findUnique({
      where: { id: notificationId },
    });

  if (notification === null) {
    throw new HttpException("Not Found", 404);
  }

  // Ownership check
  if (notification.registereduser_id !== registeredUser.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own notifications",
      403,
    );
  }

  // Reject updates to soft-deleted notifications
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification is deleted", 403);
  }

  // Helper to normalize incoming date-like values to Date for Prisma
  const normalizeToDate = (value: unknown): Date | null => {
    if (value === null) return null;
    if (value === undefined) return undefined as unknown as Date | null;
    if (value instanceof Date) return value as Date;
    // If it's a string, construct a Date
    if (typeof value === "string") return new Date(value);
    // Fallback: attempt to construct Date
    return new Date(String(value));
  };

  // Perform update and create audit entry atomically
  const [updated] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.econ_political_forum_notifications.update({
      where: { id: notificationId },
      data: {
        is_read: body.is_read ?? undefined,
        ...(body.delivered_at !== undefined && {
          delivered_at:
            body.delivered_at === null
              ? null
              : normalizeToDate(body.delivered_at),
        }),
        title: body.title ?? undefined,
        body: body.body ?? undefined,
        payload: body.payload ?? undefined,
        ...(Object.prototype.hasOwnProperty.call(body, "related_thread_id") && {
          related_thread_id: (body as any).related_thread_id,
        }),
        ...(Object.prototype.hasOwnProperty.call(body, "related_post_id") && {
          related_post_id: (body as any).related_post_id,
        }),
        ...(Object.prototype.hasOwnProperty.call(
          body,
          "related_moderation_case_id",
        ) && {
          related_moderation_case_id: (body as any).related_moderation_case_id,
        }),
        // Prisma DateTime fields should receive Date objects
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: registeredUser.id,
        action_type: "update_notification",
        target_type: "notification",
        target_identifier: notificationId,
        details: JSON.stringify({ changed_fields: Object.keys(body) }),
        // created_at stored in DB as DateTime => pass Date
        created_at: new Date(),
        created_by_system: false,
      },
    }),
  ]);

  return {
    id: updated.id,
    registereduser_id: updated.registereduser_id,
    actor_registereduser_id: updated.actor_registereduser_id ?? undefined,
    type: updated.type,
    title: updated.title ?? undefined,
    body: updated.body ?? undefined,
    payload: updated.payload,
    is_read: updated.is_read,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    related_thread_id: updated.related_thread_id ?? undefined,
    related_post_id: updated.related_post_id ?? undefined,
    related_moderation_case_id: updated.related_moderation_case_id ?? undefined,
  };
}
