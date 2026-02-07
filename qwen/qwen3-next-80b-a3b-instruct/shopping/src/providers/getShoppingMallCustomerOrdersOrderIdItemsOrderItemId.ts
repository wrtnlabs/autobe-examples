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
  orderId: string;
  orderItemId: string;
}): Promise<IShoppingMallOrderItem> {
  // Find the order item
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
    },
  });
  // Check if order item exists and is not deleted
  if (!orderItem || orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify authorization: customer must own the order or be admin
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Check if customer owns this order or is admin
  // Note: In this system, "customer" means regular user, and "admin" means system administrator
  // The props.customer is of type CustomerPayload, which is a customer, not admin
  // So we check if the customer.id matches the user who created the order
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Return the snapshot data
  return {
    id: orderItem.id,
    order_id: orderItem.order_id,
    variant_id: orderItem.variant_id,
    product_id: orderItem.product_id,
    seller_id: orderItem.seller_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    status: orderItem.status,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at: orderItem.deleted_at
      ? toISOStringSafe(orderItem.deleted_at)
      : null,
    product_name: orderItem.product_name,
    product_description: orderItem.product_description,
    category_id: orderItem.category_id,
    category_name: orderItem.category_name,
    base_price: orderItem.base_price,
    thumbnail_image: orderItem.thumbnail_image,
    all_product_images: orderItem.all_product_images,
    variant_sku: orderItem.variant_sku,
    option_values: orderItem.option_values,
    variant_price: orderItem.variant_price,
    stock_at_time_of_purchase: orderItem.stock_at_time_of_purchase,
    shop_name: orderItem.shop_name,
    shop_description: orderItem.shop_description,
    logo_url: orderItem.logo_url,
  };
}
