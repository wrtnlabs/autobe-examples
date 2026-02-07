import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

export async function getShoppingMallCustomerOrdersOrderIdItemsItemIdStatusHistory(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // Verify order ownership and retrieve order items
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  // Retrieve all status history entries for the specific order item
  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "asc",
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      price: true,
      status: true,
      product_name: true,
      variant_options: true,
      product_image_url: true,
      seller_profile_snapshot_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Transform to response format with proper date formatting
  const data = items.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: record.shopping_mall_order_id,
    shopping_mall_product_id: record.shopping_mall_product_id,
    shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
    quantity: record.quantity,
    price: record.price,
    status: record.status,
    product_name: record.product_name,
    variant_options: record.variant_options,
    product_image_url: record.product_image_url,
    seller_profile_snapshot_id: record.seller_profile_snapshot_id,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
    updated_at: record.updated_at
      ? (toISOStringSafe(record.updated_at) as string &
          tags.Format<"date-time">)
      : null,
    deleted_at: record.deleted_at
      ? (toISOStringSafe(record.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  // Calculate pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  // Construct page response
  return {
    data,
    pagination: {
      current: 1,
      limit: total,
      records: total,
      pages: total > 0 ? 1 : 0,
    } satisfies IPage.IPagination,
  };
}
