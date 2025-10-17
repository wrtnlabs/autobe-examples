import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;

  // Verify ownership of the wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: wishlistId },
    select: { shopping_mall_customer_id: true },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not owner of the wishlist", 403);
  }

  // Pagination defaults and conversion
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const skip = (page - 1) * limit;

  // Build filtering where clause
  const where = {
    shopping_mall_wishlist_id: wishlistId,
    ...(body.search !== undefined &&
      body.search !== null && {
        shopping_mall_sku_id:
          typeof body.search === "string" ? { equals: body.search } : undefined,
      }),
    deleted_at: null,
  };

  // Build orderBy inline with allowed sort fields; default to created_at
  const allowedSortFields = new Set([
    "created_at",
    "updated_at",
    "shopping_mall_sku_id",
  ]);
  const sortBy =
    typeof body.sort_by === "string" && allowedSortFields.has(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = body.order === "desc" ? "desc" : "asc";

  const orderBy = { [sortBy]: order };

  // Execute the findMany and count queries
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({ where }),
  ]);

  // Map items converting dates
  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_wishlist_id: item.shopping_mall_wishlist_id,
    shopping_mall_sku_id: item.shopping_mall_sku_id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
