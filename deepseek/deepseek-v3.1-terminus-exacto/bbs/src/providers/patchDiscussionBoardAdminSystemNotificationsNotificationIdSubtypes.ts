import { IDiscussionBoardMemberNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberNotificationPreference";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminSystemNotificationsNotificationIdSubtypes(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.ISubtypeUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Verify notification exists and admin has permission to access it
  const notification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        select: {
          id: true,
          adminNotification: {
            select: { id: true, discussion_board_admin_id: true },
          },
        },
      },
    );
  // Ensure admin has permission to update this notification subtype
  if (!notification.adminNotification) {
    throw new HttpException(
      "Administrator does not have permission to update this notification subtype",
      403,
    );
  }
  if (
    notification.adminNotification.discussion_board_admin_id !== props.admin.id
  ) {
    throw new HttpException(
      "Administrator does not have permission to update this notification subtype",
      403,
    );
  }
  // Build update data for the admin subtype
  const updateData: Prisma.discussion_board_system_notification_of_adminsUpdateInput =
    {};
  // Only update notification_context field for admin subtype (read_at and delivered_at don't exist)
  if (props.body.preferences !== undefined) {
    updateData.notification_context = props.body.preferences
      ? JSON.stringify(props.body.preferences)
      : null;
  }
  // Always update the timestamp
  updateData.updated_at = new Date();
  // Perform the update
  await MyGlobal.prisma.discussion_board_system_notification_of_admins.update({
    where: { id: notification.adminNotification.id },
    data: updateData,
  });
  // Fetch the updated notification with complete data
  const updated =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        select: {
          id: true,
          title: true,
          content: true,
          notification_type: true,
          status: true,
          priority: true,
          target_entity_type: true,
          target_entity_id: true,
          expires_at: true,
          delivered_at: true,
          read_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    notification_type: updated.notification_type,
    status: updated.status,
    priority: updated.priority,
    target_entity_type: updated.target_entity_type ?? null,
    target_entity_id: updated.target_entity_id ?? null,
    expires_at: updated.expires_at?.toISOString() ?? null,
    delivered_at: updated.delivered_at?.toISOString() ?? null,
    read_at: updated.read_at?.toISOString() ?? null,
  };
}
