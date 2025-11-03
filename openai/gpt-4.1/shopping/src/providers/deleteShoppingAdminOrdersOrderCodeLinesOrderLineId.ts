import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminOrdersOrderCodeLinesOrderLineId(props: {
  admin: AdminPayload;
  orderCode: string;
  orderLineId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the order by business order code (order_code, must not be soft deleted)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: props.orderCode, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Find the order line by ID, belonging to this order (must not be soft deleted)
  const orderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      id: props.orderLineId,
      shopping_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!orderLine) {
    throw new HttpException("Order line not found in this order", 404);
  }

  // 3. Validate business logic: only allow deletion if order and line are modifiable (not fulfilled/shipped/delivered/cancelled/refunded)
  if (
    orderLine.status === "fulfilled" ||
    orderLine.status === "shipped" ||
    orderLine.status === "delivered" ||
    orderLine.status === "cancelled" ||
    orderLine.status === "refunded" ||
    order.status === "fulfilled" ||
    order.status === "shipped" ||
    order.status === "delivered" ||
    order.status === "cancelled" ||
    order.status === "refunded"
  ) {
    throw new HttpException(
      "Order or order line already fulfilled, delivered, cancelled, or refunded; cannot delete order line.",
      400,
    );
  }

  // 4. Hard delete the order line item
  await MyGlobal.prisma.shopping_order_lines.delete({
    where: { id: props.orderLineId },
  });

  // 5. Recalculate the order total (excluding any now-deleted lines) and update parent order
  const remainingLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: order.id,
      deleted_at: null,
    },
  });
  const newTotal = remainingLines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0,
  );
  await MyGlobal.prisma.shopping_orders.update({
    where: { id: order.id },
    data: {
      total_price: newTotal,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 6. Write audit log for traceability
  const nowStr = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "order",
      event_type: "ORDER_LINE_DELETE",
      ip: null,
      description: `Admin ${props.admin.id} deleted order line ${props.orderLineId} from order ${props.orderCode}.`,
      created_at: nowStr,
      updated_at: nowStr,
      deleted_at: null,
    },
  });
}
