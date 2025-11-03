import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerOrdersOrderCodeStatusHistoryOrderStatusHistoryId(props: {
  seller: SellerPayload;
  orderCode: string;
  orderStatusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderStatusHistory> {
  // Step 1: Find the order by order_code (active only)
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: props.orderCode, deleted_at: null },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Step 2: Authorization - order must contain at least one line for this seller
  const hasLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!hasLine) {
    throw new HttpException(
      "Forbidden: You do not have access to this order",
      403,
    );
  }
  // Step 3: Lookup status history entry (by id + order id)
  const record =
    await MyGlobal.prisma.shopping_order_status_histories.findFirst({
      where: {
        id: props.orderStatusHistoryId,
        shopping_order_id: order.id,
      },
    });
  if (!record) {
    throw new HttpException("Status history event not found", 404);
  }
  return {
    id: record.id,
    shopping_order_id: record.shopping_order_id,
    shopping_order_split_id:
      record.shopping_order_split_id !== null &&
      record.shopping_order_split_id !== undefined
        ? record.shopping_order_split_id
        : undefined,
    from_status: record.from_status,
    to_status: record.to_status,
    triggered_by: record.triggered_by,
    event_note:
      record.event_note !== null && record.event_note !== undefined
        ? record.event_note
        : undefined,
    occurred_at: toISOStringSafe(record.occurred_at),
  };
}
