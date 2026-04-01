import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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

export async function patchShoppingMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with soft-delete filter and customer ownership
  const whereInput: Prisma.shopping_mall_wishlist_itemsWhereInput = {
    deleted_at: null,
    shopping_mall_customer_id: props.customer.id,
  };
  // Build created_at filter if any date range is provided
  if (
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_after !== undefined) {
      createdAtFilter.gte = new Date(props.body.created_after);
    }
    if (props.body.created_before !== undefined) {
      createdAtFilter.lte = new Date(props.body.created_before);
    }
    whereInput.created_at = createdAtFilter;
  }
  // Build order by clause based on sort parameters
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput =
    (
      sortBy === "updated_at"
        ? { updated_at: sortOrder as "asc" | "desc" }
        : { created_at: sortOrder as "asc" | "desc" }
    ) satisfies Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput;
  // Fetch wishlist items with pagination
  const data = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
