import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function getShoppingMallCustomerOrdersOrderIdItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      status: true,
      created_at: true,
      updated_at: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  return {
    id: orderItem.id,
    order_id: orderItem.shopping_mall_order_id,
    product_variant_id: orderItem.shopping_mall_product_variant_id,
    quantity: orderItem.quantity,
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    product_variant:
      orderItem.productVariant === null
        ? null
        : {
            id: orderItem.productVariant.id,
            sku_code: orderItem.productVariant.sku_code,
            stock_quantity: orderItem.productVariant.stock_quantity,
            created_at: toISOStringSafe(orderItem.productVariant.created_at),
            updated_at: toISOStringSafe(orderItem.productVariant.updated_at),
          },
  };
}
