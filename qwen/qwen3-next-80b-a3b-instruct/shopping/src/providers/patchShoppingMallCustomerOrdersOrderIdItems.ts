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

export async function patchShoppingMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // DELETE all runtime validation - no typeof checks, no string validation, no enum validation
  // We trust the JSON Schema validation that ran before this code execution
  // Use typia.assert for type safety on body to handle optional properties
  const safeBody = typia.assert<
    IShoppingMallOrderItem.IRequest & {
      status?: string;
      after?: string;
      before?: string;
      limit?: number;
      sort?: string;
    }
  >(props.body);
  // Convert status to exact enum literal type if present
  const status =
    safeBody.status !== undefined
      ? typia.assert<
          "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
        >(safeBody.status)
      : null;
  const afterCursor = safeBody.after ?? null;
  const beforeCursor = safeBody.before ?? null;
  const limit = safeBody.limit ?? 100;
  const sort = safeBody.sort ?? "created_at_asc";
  // Build filter
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    order_id: props.orderId,
    deleted_at: null,
    ...(status && { status }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  // Pagination
  const sortDirection: "asc" | "desc" =
    sort === "created_at_asc" ? "asc" : "desc";
  // Base orderBy
  const orderBy: Prisma.shopping_mall_order_itemsOrderByWithRelationInput = {
    created_at: sortDirection,
  };
  // Calculate cursor logic
  let skip = 0;
  let take = limit;
  if (afterCursor) {
    const cursorItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          ...whereInput,
          id: afterCursor,
        },
        select: { created_at: true },
      });
    if (cursorItem) {
      whereInput.created_at = {
        gt: cursorItem.created_at,
      };
    }
  }
  if (beforeCursor) {
    const cursorItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          ...whereInput,
          id: beforeCursor,
        },
        select: { created_at: true },
      });
    if (cursorItem) {
      whereInput.created_at = {
        lt: cursorItem.created_at,
      };
      orderBy.created_at = sortDirection === "asc" ? "desc" : "asc";
    }
    // When using before, reverse results at end
  }
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    take: take,
    skip: skip,
    orderBy: orderBy,
    select: {
      id: true,
      product_name: true,
      product_description: true,
      category_name: true,
      base_price: true,
      thumbnail_image: true,
      all_product_images: true,
      variant_sku: true,
      option_values: true,
      variant_price: true,
      stock_at_time_of_purchase: true,
      shop_name: true,
      shop_description: true,
      logo_url: true,
      quantity: true,
      unit_price: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Reverse if we used before cursor
  if (beforeCursor) {
    data.reverse();
  }
  // Count total records
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  // Calculate pagination
  const current =
    afterCursor || beforeCursor
      ? 1
      : Math.max(1, Math.floor(total / limit) + 1);
  const pages = Math.ceil(total / limit);
  // Transform to ISummary - No type assertion, construct properly
  const summaryData = data.map((item) => ({
    id: item.id,
    product_name: item.product_name,
    product_description: item.product_description,
    category_name: item.category_name,
    base_price: item.base_price,
    thumbnail_image: item.thumbnail_image,
    all_product_images: item.all_product_images,
    variant_sku: item.variant_sku,
    option_values: item.option_values,
    variant_price: item.variant_price,
    stock_at_time_of_purchase: item.stock_at_time_of_purchase,
    shop_name: item.shop_name,
    shop_description: item.shop_description,
    logo_url: item.logo_url,
    quantity: item.quantity,
    unit_price: item.unit_price,
    item_total: item.unit_price * item.quantity,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));
  // Return item page
  return {
    data: summaryData,
    pagination: {
      current: current,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
