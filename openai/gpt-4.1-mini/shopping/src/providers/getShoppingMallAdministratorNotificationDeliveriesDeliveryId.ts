import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallNotificationDeliveryTransformer } from "../transformers/ShoppingMallNotificationDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorNotificationDeliveriesDeliveryId(props: {
  administrator: AdministratorPayload;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallNotificationDelivery> {
  const record =
    await MyGlobal.prisma.shopping_mall_notification_deliveries.findUniqueOrThrow(
      {
        where: { id: props.deliveryId },
        ...ShoppingMallNotificationDeliveryTransformer.select(),
      },
    );
  return await ShoppingMallNotificationDeliveryTransformer.transform(record);
}
