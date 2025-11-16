import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdStatusHistoriesHistoryId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  const statusHistory =
    await MyGlobal.prisma.shopping_mall_order_status_histories.findFirst({
      where: {
        id: props.historyId,
        shopping_mall_order_id: props.orderId,
      },
    });

  if (!statusHistory) {
    throw new HttpException("Order status history record not found", 404);
  }

  return {
    id: statusHistory.id,
    shopping_mall_order_id: statusHistory.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      statusHistory.shopping_mall_order_seller_id === null
        ? null
        : statusHistory.shopping_mall_order_seller_id,
    previous_status: statusHistory.previous_status,
    new_status: statusHistory.new_status,
    actor_type: statusHistory.actor_type,
    actor_id: statusHistory.actor_id === null ? null : statusHistory.actor_id,
    change_reason: statusHistory.change_reason,
    ip_address: statusHistory.ip_address,
    created_at: toISOStringSafe(statusHistory.created_at),
  };
}
