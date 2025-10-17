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

export async function putDiscussionBoardMemberUsersUserIdNotificationsNotificationId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotification.IUpdate;
}): Promise<IDiscussionBoardNotification> {
  const { member, userId, notificationId, body } = props;

  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUniqueOrThrow({
      where: { id: notificationId },
    });

  if (notification.user_id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own notifications",
      403,
    );
  }

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own notifications",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_notifications.update({
    where: { id: notificationId },
    data: {
      is_read: body.is_read ?? undefined,
      read_at:
        body.is_read === true && notification.read_at === null
          ? now
          : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    user_id: updated.user_id ?? undefined,
    triggering_member_id: updated.triggering_member_id ?? undefined,
    triggering_moderator_id: updated.triggering_moderator_id ?? undefined,
    triggering_administrator_id:
      updated.triggering_administrator_id ?? undefined,
    related_topic_id: updated.related_topic_id ?? undefined,
    related_reply_id: updated.related_reply_id ?? undefined,
    related_moderation_action_id:
      updated.related_moderation_action_id ?? undefined,
    notification_type: updated.notification_type,
    title: updated.title,
    message: updated.message,
    link_url: updated.link_url ?? undefined,
    is_read: updated.is_read,
    is_seen: updated.is_seen,
    delivered_in_app: updated.delivered_in_app,
    delivered_via_email: updated.delivered_via_email,
    email_sent_at: updated.email_sent_at
      ? toISOStringSafe(updated.email_sent_at)
      : undefined,
    email_delivery_status: updated.email_delivery_status ?? undefined,
    email_failure_reason: updated.email_failure_reason ?? undefined,
    email_retry_count: updated.email_retry_count,
    read_at: updated.read_at ? toISOStringSafe(updated.read_at) : null,
    created_at: toISOStringSafe(updated.created_at),
  };
}
