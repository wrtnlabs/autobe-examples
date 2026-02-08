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

export async function deleteShoppingMallAdministratorShipmentsShipmentIdOrderItemsOrderItemId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.shopping_mall_shipments.findUnique({
      where: { id: props.shipmentId },
    });
    if (!shipment) {
      throw new HttpException("Shipment not found", 404);
    }
    const orderItem = await tx.shopping_mall_order_items.findUnique({
      where: { id: props.orderItemId },
    });
    if (!orderItem) {
      throw new HttpException("Order item not found", 404);
    }
    await tx.shopping_mall_shipment_order_items.deleteMany({
      where: {
        shipment: { id: props.shipmentId },
        orderItem: { id: props.orderItemId },
      },
    });
  });
}
