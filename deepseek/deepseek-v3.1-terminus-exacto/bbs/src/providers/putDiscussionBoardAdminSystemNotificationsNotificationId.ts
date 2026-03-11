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

export async function putDiscussionBoardAdminSystemNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.IUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Verify notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // Build update data with only provided fields
  const updateData: Prisma.discussion_board_system_notificationsUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.notification_type !== undefined) {
    updateData.notification_type = props.body.notification_type;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.target_entity_type !== undefined) {
    updateData.target_entity_type = props.body.target_entity_type;
  }
  if (props.body.target_entity_id !== undefined) {
    updateData.target_entity_id = props.body.target_entity_id;
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at = props.body.expires_at;
  }
  // Perform the update and fetch updated notification in one operation
  const updatedNotification =
    await MyGlobal.prisma.discussion_board_system_notifications.update({
      where: { id: props.notificationId },
      data: updateData,
      ...DiscussionBoardSystemNotificationTransformer.select(),
    });
  return await DiscussionBoardSystemNotificationTransformer.transform(
    updatedNotification,
  );
}
