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

export async function patchShoppingMallCustomerWishlistsItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  // Pagination parameters with defaults
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const sort = props.body.sort ?? "created_at";
  const cursor = props.body.cursor;
  // Find or create wishlist for customer
  let wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
  });
  if (!wishlist) {
    wishlist = await MyGlobal.prisma.shopping_mall_wishlists.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Build base where clause - filter out suspended/banned sellers
  const whereClause: Prisma.shopping_mall_wishlist_itemsWhereInput = {
    shopping_mall_wishlist_id: wishlist.id,
    product: {
      deleted_at: null,
      seller: {
        suspended: false,
        banned: false,
      },
    },
    ...(cursor !== undefined &&
      cursor !== null && { created_at: { lt: new Date(cursor) } }),
  };
  // Build orderBy clause
  const orderByInput = (
    sort === "price_asc"
      ? { product: { base_price: "asc" as const } }
      : sort === "price_desc"
        ? { product: { base_price: "desc" as const } }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput;
  // Calculate skip for page-based pagination (not used with cursor)
  const skip =
    cursor !== undefined && cursor !== null ? undefined : (page - 1) * limit;
  // Query items with pagination
  const items = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereClause,
    ...(skip !== undefined && { skip }),
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: {
      shopping_mall_wishlist_id: wishlist.id,
      product: {
        deleted_at: null,
        seller: {
          suspended: false,
          banned: false,
        },
      },
    },
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    items,
    ShoppingMallWishlistItemAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
