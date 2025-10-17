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

export async function putEconPoliticalForumRegisteredUserUsersUserIdNotificationsNotificationId(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumNotification.IUpdate;
}): Promise<IEconPoliticalForumNotification> {
  const { registeredUser, userId, notificationId, body } = props;

  // Authorization: path userId must match authenticated user
  if (registeredUser.id !== userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Validate allowed body keys: only 'is_read' permitted and required
  const allowedKeys = new Set(["is_read"]);
  const receivedKeys = Object.keys(body ?? {});
  // Reject unknown fields
  const unknown = receivedKeys.filter((k) => !allowedKeys.has(k));
  if (unknown.length > 0) {
    throw new HttpException(
      "Unknown fields in body: " + unknown.join(", "),
      400,
    );
  }

  if (!receivedKeys.includes("is_read")) {
    throw new HttpException("Missing required field: is_read", 400);
  }

  try {
    const notification =
      await MyGlobal.prisma.econ_political_forum_notifications.findUnique({
        where: { id: notificationId },
      });

    if (notification === null) {
      throw new HttpException("Not Found", 404);
    }

    if (notification.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }

    if (notification.registereduser_id !== userId) {
      throw new HttpException("Forbidden", 403);
    }

    // Respect legal holds: if a legal hold exists for the related moderation case,
    // disallow non-owner modifications. (Owner already allowed above.)
    if (notification.related_moderation_case_id !== null) {
      const hold =
        await MyGlobal.prisma.econ_political_forum_legal_holds.findFirst({
          where: {
            moderation_case_id: notification.related_moderation_case_id,
            is_active: true,
          },
        });
      if (hold !== null) {
        // If a legal hold exists, only the owner (the recipient) may update read state.
        // Since we're already enforcing ownership, no additional block is required here.
        // Keep this check for policy traceability.
      }
    }

    const now = toISOStringSafe(new Date());

    const updated =
      await MyGlobal.prisma.econ_political_forum_notifications.update({
        where: { id: notificationId },
        data: {
          is_read: body.is_read,
          updated_at: now,
        },
      });

    // Create audit log if linked to moderation case
    if (updated.related_moderation_case_id !== null) {
      const actionType = updated.is_read
        ? "notification.mark_read"
        : "notification.mark_unread";
      await MyGlobal.prisma.econ_political_forum_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: registeredUser.id,
          moderation_case_id: updated.related_moderation_case_id,
          action_type: actionType,
          target_type: "notification",
          target_identifier: updated.id,
          details: JSON.stringify({
            previous_is_read: notification.is_read,
            new_is_read: updated.is_read,
          }),
          created_at: now,
          created_by_system: false,
        },
      });
    }

    // Map DB result to DTO shape, handling nullable -> undefined for optional fields
    return {
      id: updated.id,
      registereduser_id: updated.registereduser_id,
      actor_registereduser_id:
        updated.actor_registereduser_id === null
          ? undefined
          : updated.actor_registereduser_id,
      type: updated.type,
      title: updated.title === null ? undefined : updated.title,
      body: updated.body === null ? undefined : updated.body,
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
      related_thread_id:
        updated.related_thread_id === null
          ? undefined
          : updated.related_thread_id,
      related_post_id:
        updated.related_post_id === null ? undefined : updated.related_post_id,
      related_moderation_case_id:
        updated.related_moderation_case_id === null
          ? undefined
          : updated.related_moderation_case_id,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
