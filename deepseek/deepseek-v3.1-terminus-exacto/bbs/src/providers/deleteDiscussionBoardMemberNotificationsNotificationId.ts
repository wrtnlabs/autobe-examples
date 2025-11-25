import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberNotificationsNotificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the notification exists and belongs to the authenticated member
  const notification =
    await MyGlobal.prisma.discussion_board_user_notifications.findFirst({
      where: {
        id: props.notificationId,
        discussion_board_member_id: props.member.id,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new HttpException(
      "Notification not found or you don't have permission to delete it",
      404,
    );
  }

  // Perform hard delete operation
  await MyGlobal.prisma.discussion_board_user_notifications.delete({
    where: {
      id: props.notificationId,
    },
  });
}
