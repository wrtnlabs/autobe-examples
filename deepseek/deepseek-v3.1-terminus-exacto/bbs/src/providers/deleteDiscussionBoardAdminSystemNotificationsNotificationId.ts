import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSystemNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the notification exists
  const notification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUnique({
      where: { id: props.notificationId },
    });
  if (!notification) {
    throw new HttpException("Notification not found", 404);
  }
  // Delete the main notification - cascade will handle subtype deletions
  await MyGlobal.prisma.discussion_board_system_notifications.delete({
    where: { id: props.notificationId },
  });
}
