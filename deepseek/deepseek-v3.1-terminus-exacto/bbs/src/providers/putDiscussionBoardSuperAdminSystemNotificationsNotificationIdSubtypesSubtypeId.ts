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

export async function putDiscussionBoardSuperAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.IUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // First, validate subtype exists and belongs to correct notification
  const subtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.findUniqueOrThrow(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
        },
        select: { id: true },
      },
    );
  // Then update the parent notification
  await MyGlobal.prisma.discussion_board_system_notifications.update({
    where: { id: props.notificationId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.content !== undefined && { content: props.body.content }),
      ...(props.body.notification_type !== undefined && {
        notification_type: props.body.notification_type,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
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
    },
  });
  // Fetch updated notification with transformer
  const updatedNotification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        ...DiscussionBoardSystemNotificationTransformer.select(),
      },
    );
  return await DiscussionBoardSystemNotificationTransformer.transform(
    updatedNotification,
  );
}
