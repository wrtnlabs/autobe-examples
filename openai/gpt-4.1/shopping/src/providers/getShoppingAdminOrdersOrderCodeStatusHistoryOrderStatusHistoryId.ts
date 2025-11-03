import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminOrdersOrderCodeStatusHistoryOrderStatusHistoryId(props: {
  admin: AdminPayload;
  orderCode: string;
  orderStatusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingOrderStatusHistory> {
  // Find order by unique order code
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { order_code: props.orderCode, deleted_at: null },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Find status history record matching order and statusHistoryId
  const status =
    await MyGlobal.prisma.shopping_order_status_histories.findFirst({
      where: { id: props.orderStatusHistoryId, shopping_order_id: order.id },
    });
  if (!status) throw new HttpException("Order status history not found", 404);

  return {
    id: status.id,
    shopping_order_id: status.shopping_order_id,
    shopping_order_split_id: status.shopping_order_split_id ?? undefined,
    from_status: status.from_status,
    to_status: status.to_status,
    triggered_by: status.triggered_by,
    event_note: status.event_note ?? undefined,
    occurred_at: toISOStringSafe(status.occurred_at),
  };
}
