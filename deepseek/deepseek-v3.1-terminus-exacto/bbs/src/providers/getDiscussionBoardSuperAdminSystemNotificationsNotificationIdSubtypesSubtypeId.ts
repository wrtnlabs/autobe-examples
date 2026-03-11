import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationTransformer } from "../transformers/DiscussionBoardSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemNotification> {
  // First verify the parent notification exists
  const notification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
      },
    );
  // Check which subtype table contains this subtypeId
  const adminSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.findFirst(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
      },
    );
  const memberSubtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_members.findFirst(
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
  // Verify that exactly one subtype record exists
  const subtypeCount = [adminSubtype, memberSubtype, superAdminSubtype].filter(
    Boolean,
  ).length;
  if (subtypeCount === 0) {
    throw new HttpException("Subtype not found", 404);
  }
  if (subtypeCount > 1) {
    throw new HttpException("Multiple subtypes found", 409);
  }
  // Return the parent notification using the transformer
  return await DiscussionBoardSystemNotificationTransformer.transform(
    notification,
  );
}
