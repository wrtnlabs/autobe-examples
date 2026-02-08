import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentsShipmentIdOrderItemsOrderItemId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentOrderItem> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true, seller_id: true },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  if (shipment.seller_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: { id: true },
  });
  if (!orderItem) throw new HttpException("Order item not found", 404);
  const shipmentOrderItem =
    await MyGlobal.prisma.shopping_mall_shipment_order_items.findFirst({
      where: {
        shipment: { id: props.shipmentId },
        orderItem: { id: props.orderItemId },
      },
    });
  if (!shipmentOrderItem)
    throw new HttpException("Shipment-OrderItem linkage not found", 404);
  return shipmentOrderItem;
}
