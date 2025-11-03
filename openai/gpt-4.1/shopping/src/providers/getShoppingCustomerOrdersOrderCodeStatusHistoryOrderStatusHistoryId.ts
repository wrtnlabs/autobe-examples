import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerOrdersOrderCodeStatusHistoryOrderStatusHistoryId(props: {
  customer: CustomerPayload;
  orderCode: string;
  orderStatusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderStatusHistory> {
  const { customer, orderCode, orderStatusHistoryId } = props;

  // 1. Find the order by orderCode and customer ownership
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      shopping_customer_id: customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found or unauthorized", 404);
  }

  // 2. Find the specific status history entry by ID and belonging to the order
  const status =
    await MyGlobal.prisma.shopping_order_status_histories.findFirst({
      where: {
        id: orderStatusHistoryId,
        shopping_order_id: order.id,
      },
      select: {
        id: true,
        shopping_order_id: true,
        shopping_order_split_id: true,
        from_status: true,
        to_status: true,
        triggered_by: true,
        event_note: true,
        occurred_at: true,
      },
    });
  if (!status) {
    throw new HttpException("Order status history not found", 404);
  }

  return {
    id: status.id,
    shopping_order_id: status.shopping_order_id,
    shopping_order_split_id: status.shopping_order_split_id ?? undefined,
    from_status: status.from_status,
    to_status: status.to_status,
    triggered_by: status.triggered_by,
    event_note:
      typeof status.event_note === "string" ? status.event_note : undefined,
    occurred_at: toISOStringSafe(status.occurred_at),
  };
}
