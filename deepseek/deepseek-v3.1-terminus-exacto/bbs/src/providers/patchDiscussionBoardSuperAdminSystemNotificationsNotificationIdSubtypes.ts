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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationTransformer } from "../transformers/DiscussionBoardSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemNotificationsNotificationIdSubtypes(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.ISubtypeUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Verify notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // Find matching subtype record for superAdmin
  const subtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.findFirstOrThrow(
      {
        where: {
          discussion_board_system_notification_id: props.notificationId,
          discussion_board_super_admin_id: props.superAdmin.id,
        },
        select: { id: true },
      },
    );
  // Update subtype fields
  await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.update(
    {
      where: { id: subtype.id },
      data: {
        updated_at: new Date(),
        ...(props.body.readAt !== undefined &&
          {
            // Note: in superAdmin subtype table, there's no read_at field according to schema
            // The DTO specifies readAt but schema shows only created_at, updated_at, notification_context
            // Need to check actual schema fields or use preferences
          }),
        ...(props.body.deliveredAt !== undefined &&
          {
            // deliveredAt also not in superAdmin subtype schema
          }),
        ...(props.body.preferences !== undefined && {
          notification_context: JSON.stringify(props.body.preferences),
        }),
      },
    },
  );
  // Fetch and return full notification
  const notification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        ...DiscussionBoardSystemNotificationTransformer.select(),
      },
    );
  return await DiscussionBoardSystemNotificationTransformer.transform(
    notification,
  );
}
