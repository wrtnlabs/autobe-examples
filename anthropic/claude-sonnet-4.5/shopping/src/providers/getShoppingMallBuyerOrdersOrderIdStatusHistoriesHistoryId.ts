import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerOrdersOrderIdStatusHistoriesHistoryId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const statusHistory =
    await MyGlobal.prisma.shopping_mall_order_status_histories.findUnique({
      where: { id: props.historyId },
    });

  if (!statusHistory) {
    throw new HttpException("Status history record not found", 404);
  }

  if (statusHistory.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Status history does not belong to the specified order",
      404,
    );
  }

  return {
    id: statusHistory.id,
    shopping_mall_order_id: statusHistory.shopping_mall_order_id,
    shopping_mall_order_seller_id: statusHistory.shopping_mall_order_seller_id,
    previous_status: statusHistory.previous_status,
    new_status: statusHistory.new_status,
    actor_type: statusHistory.actor_type,
    actor_id: statusHistory.actor_id,
    change_reason: statusHistory.change_reason,
    ip_address: statusHistory.ip_address,
    created_at: toISOStringSafe(statusHistory.created_at),
  };
}
