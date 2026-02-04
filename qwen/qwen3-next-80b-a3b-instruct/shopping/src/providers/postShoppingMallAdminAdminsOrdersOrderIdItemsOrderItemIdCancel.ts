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

export async function postShoppingMallAdminAdminsOrdersOrderIdItemsOrderItemIdCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate admin is authenticated (guaranteed by decorator, but double-check)
  if (!props.admin || props.admin.type !== "admin") {
    throw new HttpException("Unauthorized", 401);
  }
  // Find the order item and verify it belongs to the order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to this order",
      404,
    );
  }
  // Reject if already cancelled or refunded
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException("Order item is already cancelled or refunded", 400);
  }
  // Generate current timestamp as per spec
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Start transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Update order item status to 'cancelled'
    await prisma.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
    // 2. Create inventory record to restock the item (recorded_at, created_at, updated_at as string & tags.Format<'date-time'>)
    // Based on schema analysis, 'quantity' should be 'stock_quantity' according to database schema
    await prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        variant_id: orderItem.variant_id,
        stock_quantity: orderItem.quantity, // Correct field name based on schema
        reason: "admin_cancellation",
        source_id: props.orderItemId,
        recorded_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    // 3. Log administrative action (audit service) - Removed as MyGlobal.audit is not in schema
    // Check if all items in order are now cancelled
    const remainingNonCancelledItems =
      await prisma.shopping_mall_order_items.count({
        where: {
          order_id: props.orderId,
          status: {
            not: "cancelled",
          },
        },
      });
    // If all items are cancelled, update order status
    // Based on schema analysis, 'status' should be 'order_status' according to database schema
    if (remainingNonCancelledItems === 0) {
      await prisma.shopping_mall_orders.update({
        where: { id: props.orderId },
        data: {
          order_status: "cancelled", // Correct field name based on schema
          updated_at: now,
        },
      });
    }
  });
}
