import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallAdministratorNotificationDeliveriesNotificationDeliveryId(props: {
  administrator: AdministratorPayload;
  notificationDeliveryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const found =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findUnique({
      where: { id: props.notificationDeliveryId },
    });
  if (!found) {
    throw new HttpException("Notification delivery not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_notification_deliveries.delete({
    where: { id: props.notificationDeliveryId },
  });
}
