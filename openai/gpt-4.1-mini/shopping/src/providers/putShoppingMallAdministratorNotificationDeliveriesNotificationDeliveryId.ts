import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
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

export async function putShoppingMallAdministratorNotificationDeliveriesNotificationDeliveryId(props: {
  administrator: AdministratorPayload;
  notificationDeliveryId: string & tags.Format<"uuid">;
  body: IShoppingMallNotificationDelivery.IUpdate;
}): Promise<IShoppingMallNotificationDelivery> {
  const existing =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findUnique({
      where: { id: props.notificationDeliveryId },
    });
  if (!existing)
    throw new HttpException("Notification delivery not found", 404);
  const now = toISOStringSafe(new Date());
  const updateData = {
    updated_at: now,
  };
  const updated =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.update({
      where: { id: props.notificationDeliveryId },
      data: updateData,
    });
  return updated;
}
