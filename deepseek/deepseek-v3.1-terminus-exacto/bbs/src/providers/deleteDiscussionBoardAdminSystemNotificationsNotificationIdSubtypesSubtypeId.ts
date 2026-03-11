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

export async function deleteDiscussionBoardAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, ensure the parent notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // Attempt to find and delete from member subtype table
  const memberSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_members.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  if (memberSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_members.delete(
      {
        where: { id: props.subtypeId },
      },
    );
    return;
  }
  // Attempt to find and delete from admin subtype table
  const adminSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  if (adminSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.delete(
      {
        where: { id: props.subtypeId },
      },
    );
    return;
  }
  // Attempt to find and delete from super admin subtype table
  const superAdminSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  if (superAdminSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.delete(
      {
        where: { id: props.subtypeId },
      },
    );
    return;
  }
  // If none matched, subtype doesn't exist for this notification
  throw new HttpException(
    "Subtype association not found for the specified notification",
    404,
  );
}
