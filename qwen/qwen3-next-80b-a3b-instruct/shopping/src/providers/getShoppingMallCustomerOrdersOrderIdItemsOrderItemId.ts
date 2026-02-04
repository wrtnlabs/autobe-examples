import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Validate that the order exists and belongs to the customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found or unauthorized", 404);
  }
  // Find the specific order item within this order
  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
    },
    select: {
      id: true,
      order_id: true,
      product_id: true,
      seller_id: true,
      quantity: true,
      price_at_time: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }
  // Return the order item with expanded reference data using only safe primitive values
  return {
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    seller_id: item.seller_id,
    quantity: item.quantity,
    unit_price: item.price_at_time,
    total_price: item.price_at_time * item.quantity,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    product: undefined,
    seller: undefined,
  };
}
