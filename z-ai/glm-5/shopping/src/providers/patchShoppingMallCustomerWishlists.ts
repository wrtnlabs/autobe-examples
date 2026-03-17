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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Find customer's wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { shopping_mall_customer_id: props.customer.id },
    select: { id: true },
  });
  // If no wishlist exists, return empty result
  if (wishlist === null) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Query wishlist items with filtering for active products and approved sellers
  const whereInput = {
    shopping_mall_wishlist_id: wishlist.id,
    product: {
      deleted_at: null,
      seller: {
        suspended: false,
        banned: false,
        approval_status: "approved",
      },
    },
  } satisfies Prisma.shopping_mall_wishlist_itemsWhereInput;
  const items = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereInput,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      items,
      ShoppingMallWishlistItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
