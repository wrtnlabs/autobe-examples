import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSuperAdminNotificationsNotificationId(props: {
  superAdmin: SuperAdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const notification =
    await MyGlobal.prisma.ecommerce_mall_notifications.findUnique({
      where: { id: props.notificationId },
    });
  if (notification === null) {
    throw new HttpException("Notification not found", 404);
  }
  if (notification.deleted_at !== null) {
    throw new HttpException("Notification already deleted", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_mall_notifications.update({
      where: { id: props.notificationId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
