import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdNotificationsNotificationId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, notificationId } = props;

  // Authorization: member can only delete their own notifications
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own notifications",
      403,
    );
  }

  // Fetch notification and verify ownership
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUnique({
      where: { id: notificationId },
    });

  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }

  // Verify notification belongs to the user
  if (notification.user_id !== userId) {
    throw new HttpException(
      "Unauthorized: This notification does not belong to you",
      403,
    );
  }

  // Check if already soft deleted
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification has already been deleted", 410);
  }

  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_notifications.update({
    where: { id: notificationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
