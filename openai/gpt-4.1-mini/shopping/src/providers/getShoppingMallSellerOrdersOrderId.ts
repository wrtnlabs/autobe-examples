import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const { seller, orderId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    include: {
      shopping_mall_order_items: true,
      shopping_mall_payments: true,
    },
  });

  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: This order does not belong to you",
      403,
    );
  }

  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_seller_id: order.shopping_mall_seller_id,
    order_number: order.order_number,
    total_price: order.total_price,
    status: order.status,
    business_status: order.business_status,
    payment_method: order.payment_method,
    shipping_address: order.shipping_address,
    tracking_number: order.tracking_number ?? null,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };
}
