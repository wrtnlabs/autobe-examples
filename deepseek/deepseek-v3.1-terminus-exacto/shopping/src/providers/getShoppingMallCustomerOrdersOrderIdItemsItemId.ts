import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdItemsItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Verify the order exists and belongs to the customer
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

  // Verify the order item exists within the specified order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  // Return the order item with proper type conversion
  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      orderItem.shopping_mall_product_variant_id,
    shopping_mall_seller_id: orderItem.shopping_mall_seller_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    product_name: orderItem.product_name,
    product_attributes: orderItem.product_attributes ?? undefined,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
  };
}
