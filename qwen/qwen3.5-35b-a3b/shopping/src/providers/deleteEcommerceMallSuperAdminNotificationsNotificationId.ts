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

export async function deleteEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify notification exists and is not already deleted
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      select: { id: true, deleted_at: true },
    });
  // Check if notification is already deleted
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification already deleted", 409);
  }
  // Perform soft delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.ecommerce_mall_notifications.update({
    where: { id: props.notificationId },
    data: { deleted_at: new Date() },
  });
}
