import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_seller_id: order.shopping_mall_seller_id,
    order_number: order.order_number,
    order_status: order.order_status,
    payment_status: order.payment_status,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    created_at: order.created_at ? toISOStringSafe(order.created_at) : "",
    updated_at: order.updated_at ? toISOStringSafe(order.updated_at) : "",
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : "",
  };
}
