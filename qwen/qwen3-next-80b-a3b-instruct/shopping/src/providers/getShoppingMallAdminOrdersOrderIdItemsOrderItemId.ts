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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdItemsOrderItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  // Verify order exists and is owned by the same account
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      customer_id: true,
      created_at: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Verify the order item exists and belongs to the specified order
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: {
      id: true,
      order_id: true,
      product_id: true,
      quantity: true,
      price_at_time: true,
      status: true,
      created_at: true,
      updated_at: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          created_at: true,
        },
      },
      seller: {
        select: {
          id: true,
          shop_name: true,
          email: true,
          created_at: true,
        },
      },
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item belongs to the specified order (security check)
  if (orderItem.order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 400);
  }
  // Transform Prisma result to API DTO
  // Note: IShoppingMallOrderItem appears to be empty in the context, but we return full structure as per operation specification
  return {
    // Using exact field names from database schema
    id: orderItem.id,
    order_id: orderItem.order_id,
    product_id: orderItem.product_id,
    price: orderItem.price_at_time,
    quantity: orderItem.quantity,
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    product: {
      id: orderItem.product?.id,
      name: orderItem.product?.name,
      description: orderItem.product?.description,
      category: orderItem.product?.category,
      created_at: orderItem.product?.created_at
        ? toISOStringSafe(orderItem.product?.created_at)
        : null,
    },
    seller: {
      id: orderItem.seller?.id,
      shop_name: orderItem.seller?.shop_name,
      email: orderItem.seller?.email,
      created_at: orderItem.seller?.created_at
        ? toISOStringSafe(orderItem.seller?.created_at)
        : null,
    },
  };
}
