import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotification";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function getCommunityBbsCommunityMemberNotificationsNotificationId(props: {
  communityMember: CommunitymemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsNotification> {
  const { communityMember, notificationId } = props;

  try {
    const notification =
      await MyGlobal.prisma.community_bbs_notifications.findUnique({
        where: { id: notificationId },
        select: {
          id: true,
          recipient_id: true,
          actor_id: true,
          target_type: true,
          target_id: true,
          notification_key: true,
          notification_type: true,
          channel: true,
          priority: true,
          status: true,
          attempts: true,
          last_attempt_at: true,
          delivered_at: true,
          scheduled_at: true,
          body: true,
          payload_uri: true,
          delivery_result: true,
          suppressed: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    if (!notification) {
      throw new HttpException("Not Found", 404);
    }

    // Authorization: only the intended recipient may access this resource
    if (notification.recipient_id !== communityMember.id) {
      throw new HttpException("Forbidden", 403);
    }

    // Soft-deleted notifications are not visible to non-admin callers
    if (notification.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }

    const response: ICommunityBbsNotification = {
      id: notification.id,
      recipient_id: notification.recipient_id,
      actor_id: notification.actor_id ?? null,
      target_type: notification.target_type,
      target_id: notification.target_id,
      notification_key: notification.notification_key,
      notification_type: notification.notification_type,
      channel: notification.channel,
      priority: notification.priority,
      status: notification.status,
      attempts: notification.attempts,
      last_attempt_at: notification.last_attempt_at
        ? toISOStringSafe(notification.last_attempt_at)
        : null,
      delivered_at: notification.delivered_at
        ? toISOStringSafe(notification.delivered_at)
        : null,
      scheduled_at: notification.scheduled_at
        ? toISOStringSafe(notification.scheduled_at)
        : null,
      body: notification.body ?? null,
      payload_uri: notification.payload_uri ?? null,
      // Redact provider internals for non-admin callers (no admin payload in props)
      delivery_result: null,
      suppressed: notification.suppressed,
      created_at: toISOStringSafe(notification.created_at),
      updated_at: toISOStringSafe(notification.updated_at),
      deleted_at: notification.deleted_at
        ? toISOStringSafe(notification.deleted_at)
        : null,
    };

    return response;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
