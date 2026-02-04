import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderIdItemsOrderItemId(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // Fetch the order to verify it exists and belongs to the system
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Verify order status allows modification
  const nonModifiableStatuses = [
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  if (nonModifiableStatuses.includes(order.payment_status)) {
    throw new HttpException("Order is no longer modifiable", 403);
  }
  // Fetch the specific order item
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item belongs to the order
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 400);
  }
  // Validate status transition if provided
  if (props.body.status) {
    const validStatuses = [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  // Handle quantity update and stock validation
  const newQuantity = props.body.quantity;
  let updatedQuantity = orderItem.quantity;
  let inventoryAdjustmentDelta = 0;
  if (newQuantity !== undefined) {
    if (newQuantity < 1) {
      throw new HttpException("Quantity must be at least 1", 400);
    }
    // Fetch inventory data for this variant
    const inventory =
      await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
        where: {
          product: { id: orderItem.product_id },
          variant: { id: orderItem.variant_id },
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        take: 1,
      });
    const currentStock =
      inventory.length > 0 ? inventory[0].quantity_change : 0;
    const reservedAmount =
      await MyGlobal.prisma.shopping_mall_order_items.aggregate({
        _sum: {
          quantity: {
            where: {
              product: { id: orderItem.product_id },
              variant: { id: orderItem.variant_id },
              id: { not: props.orderItemId },
              status: { notIn: ["cancelled", "refunded"] },
            },
          },
        },
      });
    const availableStock = currentStock - (reservedAmount._sum?.quantity || 0);
    // Validate sufficient stock for new quantity
    if (newQuantity > availableStock) {
      throw new HttpException(
        "Insufficient stock available for this item",
        400,
      );
    }
    // Calculate delta for inventory adjustment
    inventoryAdjustmentDelta = newQuantity - orderItem.quantity;
    updatedQuantity = newQuantity;
  }
  // Handle status update
  const newStatus = props.body.status || orderItem.status;
  // Perform update in a transaction
  const updatedItem = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: {
      quantity: updatedQuantity,
      status: newStatus,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Adjust inventory if quantity changed
  if (inventoryAdjustmentDelta !== 0) {
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product: { connect: { id: orderItem.product_id } },
        variant: { connect: { id: orderItem.variant_id } },
        change_amount: inventoryAdjustmentDelta,
        reason: "order_item_update",
        source_id: props.orderId,
        created_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Validate returned type matches API DTO
  return {
    id: updatedItem.id,
    order_id: updatedItem.order_id,
    productId: updatedItem.product_id,
    variantId: updatedItem.variant_id,
    quantity: updatedItem.quantity,
    status: updatedItem.status,
    subtotal: updatedItem.price_at_time,
    created_at: toISOStringSafe(updatedItem.created_at),
    updated_at: toISOStringSafe(updatedItem.updated_at),
  };
}
