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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdItemsOrderItemId(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
}): Promise<void> {
  // Fetch order item with its current status and price_at_time, quantity, and associated order total
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.orderItemId,
    },
    select: {
      id: true,
      status: true,
      price_at_time: true,
      quantity: true,
      order_id: true,
      order: {
        select: {
          total_price: true,
          updated_at: true,
        },
      },
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Ensure order matches the expected order ID
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to specified order",
      404,
    );
  }
  // Validate status is eligible for deletion
  if (orderItem.status !== "paid" && orderItem.status !== "awaiting_shipment") {
    throw new HttpException(
      "Order item cannot be deleted: status is not cancellable",
      409,
    );
  }
  // Calculate price to subtract from order total
  const itemTotalPrice = orderItem.price_at_time * orderItem.quantity;
  // Ensure parent order exists and has a valid total_price
  if (!orderItem.order) {
    throw new HttpException("Parent order missing or invalid", 404);
  }
  // Hard delete order item
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: {
      id: props.orderItemId,
    },
  });
  // Update the parent order's total_price
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: {
      id: props.orderId,
    },
    data: {
      total_price: orderItem.order.total_price - itemTotalPrice,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
