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

export async function deleteDiscussionBoardSuperAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify parent notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // 2. Find which subtype table contains this ID with correct notification association
  const memberSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_members.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  const adminSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  const superAdminSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  // 3. Delete from appropriate table
  if (memberSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_members.delete(
      {
        where: { id: props.subtypeId },
      },
    );
  } else if (adminSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.delete(
      {
        where: { id: props.subtypeId },
      },
    );
  } else if (superAdminSubtype) {
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.delete(
      {
        where: { id: props.subtypeId },
      },
    );
  } else {
    throw new HttpException("Subtype association not found", 404);
  }
  // 4. Return void (implicit)
}
