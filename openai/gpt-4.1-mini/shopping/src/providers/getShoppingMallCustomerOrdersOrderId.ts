import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
    throw new HttpException("Order not found", 404);
  }
  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    order_number: order.order_number,
    total_price: order.total_price,
    total_quantity: order.total_quantity,
    order_status: order.order_status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      order.deleted_at === null ? null : toISOStringSafe(order.deleted_at),
  };
}
