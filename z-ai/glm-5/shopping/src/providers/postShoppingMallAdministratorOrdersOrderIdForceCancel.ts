import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrdersOrderIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IForceCancel;
}): Promise<IShoppingMallOrder> {
  // Find the order with its items
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      orderItems: {
        select: {
          id: true,
          quantity: true,
          variant: {
            select: { id: true },
          },
          status: true,
        },
      },
    },
  });
  if (order.orderItems.length === 0) {
    throw new HttpException("Order has no items to cancel", 400);
  }
  const now = new Date();
  const inventoryReason = `Force-cancel by administrator: ${props.body.reason}`;
  // Execute all operations in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Collect item IDs and prepare inventory records
    const itemIds: string[] = [];
    const inventoryRecords: Prisma.shopping_mall_inventory_recordsCreateManyInput[] =
      [];
    for (const item of order.orderItems) {
      itemIds.push(item.id);
      inventoryRecords.push({
        id: v4(),
        variant_id: item.variant.id,
        order_id: props.orderId,
        quantity_change: item.quantity,
        reason: inventoryReason,
        created_at: now,
      });
    }
    // Update all order items to cancelled in one operation
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // Create all inventory records in one operation
    await tx.shopping_mall_inventory_records.createMany({
      data: inventoryRecords,
    });
    // Close any pending cancellation requests for these items
    await tx.shopping_mall_cancellation_requests.updateMany({
      where: {
        shopping_mall_order_item_id: { in: itemIds },
        status: "pending",
      },
      data: {
        status: "approved",
        responded_at: now,
        updated_at: now,
      },
    });
    // Update order status to cancelled
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
  });
  // Fetch and return the updated order
  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      ...ShoppingMallOrderTransformer.select(),
    });
  return await ShoppingMallOrderTransformer.transform(updatedOrder);
}
