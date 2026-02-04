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

export async function postShoppingMallAdminAdminsOrdersOrderIdItemsOrderItemIdRefund(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Validate super admin status
  if (props.admin.type !== "admin") {
    throw new HttpException("Only super administrators can force refunds", 403);
  }
  // Begin transaction for atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Find order and order item with necessary fields
    const orderItem = await prisma.shopping_mall_order_items.findUnique({
      where: {
        id: props.orderItemId,
      },
      select: {
        id: true,
        variantId: true,
        quantity: true,
        status: true,
        orderId: true,
      },
    });
    if (!orderItem) {
      throw new HttpException("Order item not found", 404);
    }
    // Validate delivery status
    if (orderItem.status !== "delivered") {
      throw new HttpException("Can only refund delivered items", 400);
    }
    // Generate consistent timestamp
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    // Create refund request
    await prisma.shopping_mall_refund_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        orderId: props.orderItemId,
        status: "pending" as const,
        reason: "admin-forced" as const,
        adminId: props.admin.id,
        requestedAt: now,
        refundedAt: now,
      },
    });
    // Restore inventory
    await prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        variantId: orderItem.variantId,
        changeQty: orderItem.quantity,
        changeType: "refund" as const,
        referenceId: orderItem.id,
        executedAt: now,
      },
    });
    // Update order status to partially_refunded if other delivered items exist
    const order = await prisma.shopping_mall_orders.findUnique({
      where: { id: props.orderId },
      select: {
        id: true,
        status: true,
      },
    });
    if (!order) {
      throw new HttpException("Order not found", 404);
    }
    const orderItems = await prisma.shopping_mall_order_items.findMany({
      where: { orderId: props.orderId },
      select: { id: true, status: true },
    });
    const remainingDeliveredItems = orderItems.filter(
      (item: { status: string; id: string }) =>
        item.status === "delivered" && item.id !== props.orderItemId,
    ).length;
    const newOrderStatus =
      remainingDeliveredItems === 0
        ? ("fully_refunded" as const)
        : ("partially_refunded" as const);
    // Update order status using the correct field name from schema
    await prisma.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { status: newOrderStatus },
    });
  });
}
