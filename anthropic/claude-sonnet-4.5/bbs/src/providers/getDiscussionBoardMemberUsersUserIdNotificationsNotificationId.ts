import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberUsersUserIdNotificationsNotificationId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotification> {
  const { member, userId, notificationId } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only access your own notifications",
      403,
    );
  }

  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new HttpException(
      "Notification not found or you do not have permission to access it",
      404,
    );
  }

  return {
    id: notification.id,
    user_id: notification.user_id === null ? undefined : notification.user_id,
    triggering_member_id: notification.triggering_member_id ?? null,
    triggering_moderator_id: notification.triggering_moderator_id ?? null,
    triggering_administrator_id:
      notification.triggering_administrator_id ?? null,
    related_topic_id: notification.related_topic_id ?? null,
    related_reply_id: notification.related_reply_id ?? null,
    related_moderation_action_id:
      notification.related_moderation_action_id ?? null,
    notification_type: notification.notification_type,
    title: notification.title,
    message: notification.message,
    link_url: notification.link_url ?? null,
    is_read: notification.is_read,
    is_seen: notification.is_seen,
    delivered_in_app: notification.delivered_in_app,
    delivered_via_email: notification.delivered_via_email,
    email_sent_at: notification.email_sent_at
      ? toISOStringSafe(notification.email_sent_at)
      : null,
    email_delivery_status: notification.email_delivery_status ?? null,
    email_failure_reason: notification.email_failure_reason ?? null,
    email_retry_count: notification.email_retry_count,
    read_at: notification.read_at
      ? toISOStringSafe(notification.read_at)
      : null,
    created_at: toISOStringSafe(notification.created_at),
  };
}
