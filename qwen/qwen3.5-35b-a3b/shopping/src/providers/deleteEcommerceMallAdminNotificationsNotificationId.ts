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

export async function deleteEcommerceMallAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUniqueOrThrow({
      where: { id: props.notificationId },
      select: { id: true, deleted_at: true },
    });
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification already deleted", 409);
  }
  await MyGlobal.prisma.ecommerce_mall_notifications.update({
    where: { id: props.notificationId },
    data: { deleted_at: new Date() },
  });
}
