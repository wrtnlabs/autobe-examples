import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemNotificationTransformer } from "../transformers/CommunityPlatformSystemNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminSystemNotificationsSystemNotificationId(props: {
  admin: AdminPayload;
  systemNotificationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemNotification.IUpdate;
}): Promise<ICommunityPlatformSystemNotification> {
  // Verify the notification exists
  const existingNotification =
    await MyGlobal.prisma.community_platform_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.systemNotificationId },
      },
    );
  // Validate allowed status values
  const allowedStatuses = ["pending", "processing", "completed"];
  if (
    props.body.status !== undefined &&
    !allowedStatuses.includes(props.body.status)
  ) {
    throw new HttpException(
      `Invalid status value. Allowed values: ${allowedStatuses.join(", ")}`,
      400,
    );
  }
  // Validate allowed priority values
  const allowedPriorities = ["low", "normal", "high", "urgent"];
  if (
    props.body.priority !== undefined &&
    !allowedPriorities.includes(props.body.priority)
  ) {
    throw new HttpException(
      `Invalid priority value. Allowed values: ${allowedPriorities.join(", ")}`,
      400,
    );
  }
  // Prepare update data
  const updateData: Prisma.community_platform_system_notificationsUpdateInput =
    {};
  // Update allowed fields
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.message !== undefined) {
    updateData.message = props.body.message;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
    // If status changes to 'completed', set processed_at to current ISO string
    if (
      props.body.status === "completed" &&
      existingNotification.status !== "completed"
    ) {
      updateData.processed_at = toISOStringSafe(new Date());
    }
  }
  if (props.body.action_url !== undefined) {
    updateData.action_url = props.body.action_url;
  }
  // Perform the update
  await MyGlobal.prisma.community_platform_system_notifications.update({
    where: { id: props.systemNotificationId },
    data: updateData,
  });
  // Retrieve the updated notification with full relations
  const updatedNotification =
    await MyGlobal.prisma.community_platform_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.systemNotificationId },
        ...CommunityPlatformSystemNotificationTransformer.select(),
      },
    );
  return await CommunityPlatformSystemNotificationTransformer.transform(
    updatedNotification,
  );
}
