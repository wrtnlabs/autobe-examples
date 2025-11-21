import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Check if order status allows item deletion
  const nonModifiableStatuses = [
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "refunded",
  ];
  if (nonModifiableStatuses.includes(order.status)) {
    throw new HttpException(
      "Cannot delete items from an order that has already been shipped or completed",
      400,
    );
  }

  // Verify the order item exists and belongs to the specified order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Permanently delete the order item
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: {
      id: props.itemId,
    },
  });

  // Update order totals after item removal
  const remainingItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
      },
    });

  const newSubtotal = remainingItems.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );
  const newTotal = newSubtotal + order.tax_amount + order.shipping_amount;

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: {
      id: props.orderId,
    },
    data: {
      subtotal_amount: newSubtotal,
      total_amount: newTotal,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
