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
import { DiscussionBoardSystemNotificationTransformer } from "../transformers/DiscussionBoardSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.IUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // 1. Verify notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // 2. Check if subtype exists and belongs to this notification
  // Use OR condition to check all three subtype tables
  const whereCondition = {
    id: props.subtypeId,
    discussion_board_system_notification_id: props.notificationId,
  } satisfies Prisma.discussion_board_system_notification_of_adminsWhereInput;
  const subtypeCount = await MyGlobal.prisma.$transaction(async (tx) => {
    const counts = await Promise.all([
      tx.discussion_board_system_notification_of_admins.count({
        where: whereCondition,
      }),
      tx.discussion_board_system_notification_of_members.count({
        where: whereCondition,
      }),
      tx.discussion_board_system_notification_of_super_admins.count({
        where: whereCondition,
      }),
    ]);
    return counts.reduce((sum, count) => sum + count, 0);
  });
  if (subtypeCount === 0) {
    throw new HttpException(
      "Subtype not found or does not belong to the specified notification",
      404,
    );
  }
  // 3. Build typed update data
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.notification_type !== undefined && {
      notification_type: props.body.notification_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.target_entity_type !== undefined && {
      target_entity_type: props.body.target_entity_type,
    }),
    ...(props.body.target_entity_id !== undefined && {
      target_entity_id: props.body.target_entity_id,
    }),
    ...(props.body.expires_at !== undefined && {
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : null,
    }),
    updated_at: new Date(),
  } satisfies Prisma.discussion_board_system_notificationsUpdateInput;
  // 4. Update notification
  await MyGlobal.prisma.discussion_board_system_notifications.update({
    where: { id: props.notificationId },
    data: updateData,
  });
  // 5. Fetch and return updated notification
  const updated =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        ...DiscussionBoardSystemNotificationTransformer.select(),
      },
    );
  return await DiscussionBoardSystemNotificationTransformer.transform(updated);
}
