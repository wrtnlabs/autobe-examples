import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
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

export async function putShoppingMallAdministratorShipmentsShipmentIdOrderItemsOrderItemId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentOrderItem> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);
  const existingLinkage =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findFirst({
      where: {
        shipment: { id: props.shipmentId },
        orderItem: { id: props.orderItemId },
      },
    });
  if (existingLinkage) return existingLinkage;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.create({
      data: {
        id: v4(),
        shipment: { connect: { id: props.shipmentId } },
        orderItem: { connect: { id: props.orderItemId } },
        created_at: now,
        updated_at: now,
      },
    });
  console.log(
    `Administrator ${props.administrator.id} linked order item ${props.orderItemId} to shipment ${props.shipmentId} at ${now}`,
  );
  return created;
}
