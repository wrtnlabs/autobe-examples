import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getRedditCommunityMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityNotification> {
  const notification =
    await MyGlobal.prisma.reddit_community_notifications.findUnique({
      where: { id: props.notificationId },
    });

  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }

  if (notification.recipient_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  let updatedNotification = notification;
  if (notification.read_at === null) {
    updatedNotification =
      await MyGlobal.prisma.reddit_community_notifications.update({
        where: { id: props.notificationId },
        data: {
          read_at: new Date(),
          updated_at: new Date(),
        },
      });
  }

  return {
    id: updatedNotification.id,
    recipient_id: updatedNotification.recipient_id,
    notification_type: updatedNotification.notification_type,
    title: updatedNotification.title,
    body: updatedNotification.body,
    delivery_method: updatedNotification.delivery_method,
    post_id: updatedNotification.post_id ?? null,
    comment_id: updatedNotification.comment_id ?? null,
    report_id: updatedNotification.report_id ?? null,
    ban_id: updatedNotification.ban_id ?? null,
    appeal_id: updatedNotification.appeal_id ?? null,
    moderation_action_id: updatedNotification.moderation_action_id ?? null,
    is_read: updatedNotification.read_at !== null,
    read_at: updatedNotification.read_at
      ? toISOStringSafe(updatedNotification.read_at)
      : null,
    created_at: toISOStringSafe(updatedNotification.created_at),
    updated_at: toISOStringSafe(updatedNotification.updated_at),
    deleted_at: updatedNotification.deleted_at
      ? toISOStringSafe(updatedNotification.deleted_at)
      : null,
  };
}
