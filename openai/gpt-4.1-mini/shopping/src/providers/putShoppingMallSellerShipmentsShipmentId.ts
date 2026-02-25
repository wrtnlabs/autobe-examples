import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  // Check shipment existence and ownership
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { seller_id: true },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this shipment", 403);
  }
  // Validate shipment order item IDs presence
  const orderItemIds = props.body.shipmentOrderItems
    .map((item) => item.shoppingMallOrderItemId)
    .filter((id): id is string & tags.Format<"uuid"> => id !== undefined);
  if (orderItemIds.length !== props.body.shipmentOrderItems.length) {
    throw new HttpException(
      "Invalid shipmentOrderItems: missing order item IDs",
      400,
    );
  }
  // Fetch order items and verify existence
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { id: { in: orderItemIds }, deleted_at: null },
    select: { id: true, shopping_mall_order_id: true },
  });
  if (orderItems.length !== orderItemIds.length) {
    throw new HttpException("One or more order items do not exist", 404);
  }
  // Extract unique order IDs
  const orderIdsSet = new Set<string & tags.Format<"uuid">>();
  for (const item of orderItems) {
    orderIdsSet.add(
      item.shopping_mall_order_id as string & tags.Format<"uuid">,
    );
  }
  const orderIds = Array.from(orderIdsSet);
  // Verify all orders belong to the seller (using seller_id)
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: { in: orderIds },
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
    select: { id: true },
  });
  if (orders.length !== orderIds.length) {
    throw new HttpException("One or more orders do not belong to you", 403);
  }
  // Perform transactional update of shipment and shipment order items
  const updatedShipment = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update shipment status and updated_at timestamp
    await prisma.shopping_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        status: props.body.status,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
    // Delete existing shipment_order_items linked to this shipment
    await prisma.shopping_mall_shipment_order_items.deleteMany({
      where: { shopping_mall_shipment_id: props.shipmentId },
    });
    // Insert new shipment_order_items
    if (props.body.shipmentOrderItems.length > 0) {
      const createManyData = props.body.shipmentOrderItems.map((item) => ({
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_shipment_id: props.shipmentId,
        shopping_mall_order_item_id: item.shoppingMallOrderItemId!,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      }));
      await prisma.shopping_mall_shipment_order_items.createMany({
        data: createManyData,
      });
    }
    // Fetch updated shipment with relations for transformation
    return prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  });
  // Transform and return the updated shipment DTO
  return await ShoppingMallShipmentTransformer.transform(updatedShipment);
}
