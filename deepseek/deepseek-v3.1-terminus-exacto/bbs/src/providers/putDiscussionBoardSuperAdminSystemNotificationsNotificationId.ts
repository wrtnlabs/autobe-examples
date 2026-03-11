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

export async function putDiscussionBoardSuperAdminSystemNotificationsNotificationId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.IUpdate;
}): Promise<IDiscussionBoardSystemNotification> {
  // Verify notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
    },
  );
  // Build partial update data
  const data: Prisma.discussion_board_system_notificationsUpdateInput = {
    updated_at: new Date(),
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
  };
  // Perform update
  await MyGlobal.prisma.discussion_board_system_notifications.update({
    where: { id: props.notificationId },
    data,
  });
  // Fetch updated notification with Transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        ...DiscussionBoardSystemNotificationTransformer.select(),
      },
    );
  // Transform and return
  return await DiscussionBoardSystemNotificationTransformer.transform(updated);
}
