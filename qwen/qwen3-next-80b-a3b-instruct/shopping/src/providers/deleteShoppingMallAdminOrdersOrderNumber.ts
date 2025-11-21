import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderNumber(props: {
  admin: AdminPayload;
  orderNumber: string;
}): Promise<void> {
  // Find the order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null, // Only active orders can be hard deleted
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Begin transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Delete order items
    await prisma.shopping_mall_order_items.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });

    // 2. Delete order payments
    await prisma.shopping_mall_order_payments.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });

    // 3. Delete order shipping info
    await prisma.shopping_mall_order_shipping.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });

    // 4. Delete order returns
    await prisma.shopping_mall_order_returns.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });

    // 5. Delete order status history
    await prisma.shopping_mall_order_status_history.deleteMany({
      where: { shopping_mall_order_id: order.id },
    });

    // 6. Delete the order itself
    await prisma.shopping_mall_orders.delete({
      where: { id: order.id },
    });

    // 7. Create audit log for hard delete
    await prisma.shopping_mall_audit_logs.create({
      data: {
        actor_id: props.admin.id,
        actor_type: "admin",
        event_type: "order_hard_delete",
        event_details: `Admin ${props.admin.id} permanently deleted order ${props.orderNumber}`,
        status: "success",
        source: "admin_dashboard",
        created_at: toISOStringSafe(new Date()),
        id: v4(),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    // 8. Create data change log for order deletion
    await prisma.shopping_mall_data_change_logs.create({
      data: {
        actor_id: props.admin.id,
        actor_type: "admin",
        entity_type: "order",
        change_type: "delete",
        entity_id: order.id,
        change_reason: "Hard delete requested by admin",
        created_at: toISOStringSafe(new Date()),
        id: v4(),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
