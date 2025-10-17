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

export async function putShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const { seller, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized: You do not own this order", 403);
  }

  const updatedAt = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: orderId },
    data: {
      shopping_mall_customer_id: body.shopping_mall_customer_id ?? undefined,
      shopping_mall_seller_id: body.shopping_mall_seller_id ?? undefined,
      order_number: body.order_number ?? undefined,
      total_price: body.total_price ?? undefined,
      status: body.status ?? undefined,
      business_status: body.business_status ?? undefined,
      payment_method: body.payment_method ?? undefined,
      shipping_address: body.shipping_address ?? undefined,
      tracking_number:
        body.tracking_number === null
          ? null
          : (body.tracking_number ?? undefined),
      updated_at: updatedAt,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    order_number: updated.order_number,
    total_price: updated.total_price,
    status: updated.status,
    business_status: updated.business_status,
    payment_method: updated.payment_method,
    shipping_address: updated.shipping_address,
    tracking_number: updated.tracking_number ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
