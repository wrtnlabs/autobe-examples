import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorNotificationLogsNotificationLogId(props: {
  administrator: AdministratorPayload;
  notificationLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationLog> {
  // Verify the notification log entry exists
  const existingLog =
    await MyGlobal.prisma.shopping_mall_notification_logs.findUnique({
      where: { id: props.notificationLogId },
    });
  if (!existingLog) {
    throw new HttpException("Notification log not found", 404);
  }
  // Delete the notification log entry atomically
  const deletedLog = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_notification_logs.delete({
      where: { id: props.notificationLogId },
    });
  });
  // Return the deleted record as confirmation
  return deletedLog;
}
