import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemAtSummaryTransformer } from "../transformers/ShoppingMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const limit = props.body.limit ?? 20;
  const sort = props.body.sort ?? "created_at";
  const cursor = props.body.cursor;
  const page = props.body.page;
  // Find customer's wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  if (!wishlist) {
    return {
      data: [],
      pagination: {
        current: page ?? 1,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Base WHERE conditions filtering deleted products and suspended/banned sellers
  const baseWhere = {
    shopping_mall_wishlist_id: wishlist.id,
    product: {
      deleted_at: null,
      seller: {
        suspended: false,
        banned: false,
      },
    },
  } satisfies Prisma.shopping_mall_wishlist_itemsWhereInput;
  // Cursor-based WHERE (for cursor pagination)
  const whereWithCursor = cursor
    ? ({
        ...baseWhere,
        created_at: { lt: new Date(cursor) },
      } satisfies Prisma.shopping_mall_wishlist_itemsWhereInput)
    : baseWhere;
  // Determine pagination mode
  const useCursorPagination = cursor !== undefined && page === undefined;
  // Build ORDER BY
  const orderBy: Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput =
    sort === "price_asc"
      ? { product: { base_price: "asc" } }
      : sort === "price_desc"
        ? { product: { base_price: "desc" } }
        : { created_at: "desc" };
  // Query wishlist items
  const items = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: useCursorPagination ? whereWithCursor : baseWhere,
    skip: useCursorPagination ? undefined : ((page ?? 1) - 1) * limit,
    take: limit,
    orderBy,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: baseWhere,
  });
  return {
    data: await ArrayUtil.asyncMap(
      items,
      ShoppingMallWishlistItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page ?? 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
