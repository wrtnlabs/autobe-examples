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

export async function patchEconPoliticalForumRegisteredUserUsersUserIdNotificationsNotificationId(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumNotification.IUpdate;
}): Promise<IEconPoliticalForumNotification> {
  const { registeredUser, userId, notificationId, body } = props;

  if (registeredUser.id !== userId) {
    throw new HttpException("Forbidden: caller does not match userId", 403);
  }

  const allowedKeys = new Set([
    "is_read",
    "delivered_at",
    "title",
    "body",
    "payload",
  ]);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw new HttpException(`Unknown field in body: ${key}`, 400);
    }
  }

  const notification =
    await MyGlobal.prisma.econ_political_forum_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) throw new HttpException("Not Found", 404);
  if (notification.registereduser_id !== userId)
    throw new HttpException("Forbidden: not the owner", 403);

  const contentUpdating =
    body.payload !== undefined ||
    body.title !== undefined ||
    body.body !== undefined;
  if (contentUpdating) {
    if (notification.related_post_id) {
      const hold =
        await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
          where: { post_id: notification.related_post_id, is_active: true },
        });
      if (hold) throw new HttpException("Forbidden: legal_hold", 403);
    }
    if (notification.related_thread_id) {
      const hold =
        await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
          where: { thread_id: notification.related_thread_id, is_active: true },
        });
      if (hold) throw new HttpException("Forbidden: legal_hold", 403);
    }
    if (notification.related_moderation_case_id) {
      const hold =
        await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
          where: {
            moderation_case_id: notification.related_moderation_case_id,
            is_active: true,
          },
        });
      if (hold) throw new HttpException("Forbidden: legal_hold", 403);
    }
  }

  let sanitizedPayload: string | undefined = undefined;
  if (body.payload !== undefined) {
    try {
      JSON.parse(body.payload);
    } catch (err) {
      throw new HttpException("Bad Request: payload must be valid JSON", 400);
    }

    const removeScript = (s: string) =>
      s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    const removeOnAttrs = (s: string) =>
      s.replace(/\son[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, "");
    const trimmed = removeOnAttrs(removeScript(body.payload)).trim();
    if (trimmed.length === 0)
      throw new HttpException("Bad Request: payload sanitized to empty", 400);
    if (trimmed.length > 20000)
      throw new HttpException("Bad Request: payload too large", 400);
    sanitizedPayload = trimmed;
  }

  if (body.delivered_at !== undefined) {
    const pref =
      await MyGlobal.prisma.econ_political_forum_notification_preferences.findUnique(
        {
          where: { registereduser_id: userId },
        },
      );
    if (
      pref &&
      pref.in_app === false &&
      pref.email === false &&
      pref.push === false
    ) {
      throw new HttpException(
        "Bad Request: delivery disabled by user preferences",
        400,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.econ_political_forum_notifications.update({
      where: { id: notificationId },
      data: {
        is_read: body.is_read ?? undefined,
        delivered_at:
          body.delivered_at === null ? null : (body.delivered_at ?? undefined),
        title: body.title ?? undefined,
        body: body.body ?? undefined,
        payload:
          sanitizedPayload ??
          (body.payload === undefined ? undefined : sanitizedPayload),
        updated_at: now,
      },
    });

  if (contentUpdating && notification.related_moderation_case_id) {
    await MyGlobal.prisma.econ_political_forum_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registereduser_id: registeredUser.id,
        moderator_id: null,
        post_id: notification.related_post_id ?? null,
        thread_id: notification.related_thread_id ?? null,
        report_id: null,
        moderation_case_id: notification.related_moderation_case_id ?? null,
        action_type: "update_notification",
        target_type: "notification",
        target_identifier: notificationId,
        details: JSON.stringify({
          before: {
            title: notification.title,
            body: notification.body,
            payload: notification.payload,
          },
          after: {
            title: body.title ?? notification.title,
            body: body.body ?? notification.body,
            payload: sanitizedPayload ?? notification.payload,
          },
        }),
        created_at: now,
        created_by_system: false,
      },
    });
  }

  return {
    id: updated.id as string & tags.Format<"uuid">,
    registereduser_id: updated.registereduser_id as string &
      tags.Format<"uuid">,
    actor_registereduser_id:
      updated.actor_registereduser_id === null
        ? undefined
        : (updated.actor_registereduser_id as string & tags.Format<"uuid">),
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
    related_thread_id: updated.related_thread_id
      ? (updated.related_thread_id as string & tags.Format<"uuid">)
      : undefined,
    related_post_id: updated.related_post_id
      ? (updated.related_post_id as string & tags.Format<"uuid">)
      : undefined,
    related_moderation_case_id: updated.related_moderation_case_id
      ? (updated.related_moderation_case_id as string & tags.Format<"uuid">)
      : undefined,
  };
}
