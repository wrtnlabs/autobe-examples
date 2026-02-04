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
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallOrderItem> {
  // Validate orderId is provided
  if (!props.orderId) {
    throw new HttpException("Order ID is required", 400);
  }
  // Extract pagination parameters from request (using default values)
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  // Query order items with necessary joins
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      order_id: props.orderId,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
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
      product: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      seller: {
        select: {
          id: true,
          shop_name: true,
        },
      },
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      order_id: props.orderId,
    },
  });
  // Transform data to match IPageIShoppingMallOrderItem structure
  // Convert Date objects to ISO strings with toISOStringSafe
  const transformedData = data.map((item) => ({
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    seller_id: item.seller_id,
    quantity: item.quantity,
    unit_price: item.price_at_time, // Map price_at_time to unit_price for output
    total_price: item.price_at_time * item.quantity, // Calculate total_price from unit_price * quantity
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    // Product info
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
        }
      : undefined,
    // Seller info
    seller: item.seller
      ? {
          id: item.seller.id,
          shop_name: item.seller.shop_name,
        }
      : undefined,
    // Historical snapshot (latest)
    snapshot: undefined, // Removing non-existent snapshots relation
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
