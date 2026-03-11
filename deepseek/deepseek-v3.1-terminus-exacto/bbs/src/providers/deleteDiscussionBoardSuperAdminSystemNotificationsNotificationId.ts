import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSystemNotificationsNotificationId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction for atomic operations
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify notification exists and superAdmin has permission
    const notification =
      await tx.discussion_board_system_notifications.findUnique({
        where: { id: props.notificationId },
      });
    if (!notification) {
      throw new HttpException("Notification not found", 404);
    }
    // Delete subtype records
    await tx.discussion_board_system_notification_of_admins.deleteMany({
      where: { discussion_board_system_notification_id: props.notificationId },
    });
    await tx.discussion_board_system_notification_of_members.deleteMany({
      where: { discussion_board_system_notification_id: props.notificationId },
    });
    await tx.discussion_board_system_notification_of_super_admins.deleteMany({
      where: { discussion_board_system_notification_id: props.notificationId },
    });
    // Delete main notification
    await tx.discussion_board_system_notifications.delete({
      where: { id: props.notificationId },
    });
  });
}
