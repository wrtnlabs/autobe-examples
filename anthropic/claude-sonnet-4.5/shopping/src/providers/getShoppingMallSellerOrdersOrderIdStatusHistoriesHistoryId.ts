import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdStatusHistoriesHistoryId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  const statusHistory =
    await MyGlobal.prisma.shopping_mall_order_status_histories.findUnique({
      where: { id: props.historyId },
    });

  if (!statusHistory) {
    throw new HttpException("Order status history not found", 404);
  }

  if (statusHistory.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order status history not found", 404);
  }

  const orderSeller =
    await MyGlobal.prisma.shopping_mall_order_sellers.findFirst({
      where: {
        shopping_mall_order_id: props.orderId,
        shopping_mall_seller_id: props.seller.id,
      },
    });

  if (!orderSeller) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: statusHistory.id,
    shopping_mall_order_id: statusHistory.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      statusHistory.shopping_mall_order_seller_id ?? undefined,
    previous_status: statusHistory.previous_status ?? undefined,
    new_status: statusHistory.new_status,
    actor_type: statusHistory.actor_type,
    actor_id: statusHistory.actor_id ?? undefined,
    change_reason: statusHistory.change_reason ?? undefined,
    ip_address: statusHistory.ip_address ?? undefined,
    created_at: toISOStringSafe(statusHistory.created_at),
  };
}
