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

export async function putRedditCommunityMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IRedditCommunityNotification.IUpdate;
}): Promise<IRedditCommunityNotification> {
  const existing =
    await MyGlobal.prisma.reddit_community_notifications.findUnique({
      where: { id: props.notificationId },
    });

  if (!existing) {
    throw new HttpException("Notification not found", 404);
  }

  if (existing.recipient_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_notifications.update({
    where: { id: props.notificationId },
    data: {
      ...(props.body.is_read !== undefined && {
        read_at: props.body.is_read ? new Date() : null,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    recipient_id: updated.recipient_id,
    notification_type: updated.notification_type,
    title: updated.title,
    body: updated.body,
    delivery_method: updated.delivery_method,
    post_id: updated.post_id === null ? undefined : updated.post_id,
    comment_id: updated.comment_id === null ? undefined : updated.comment_id,
    report_id: updated.report_id === null ? undefined : updated.report_id,
    ban_id: updated.ban_id === null ? undefined : updated.ban_id,
    appeal_id: updated.appeal_id === null ? undefined : updated.appeal_id,
    moderation_action_id:
      updated.moderation_action_id === null
        ? undefined
        : updated.moderation_action_id,
    is_read: updated.read_at !== null,
    read_at:
      updated.read_at === null ? undefined : toISOStringSafe(updated.read_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
