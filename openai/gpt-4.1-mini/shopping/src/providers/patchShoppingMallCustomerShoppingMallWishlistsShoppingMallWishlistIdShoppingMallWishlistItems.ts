import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistIdShoppingMallWishlistItems(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  // Verify the wishlist exists and belongs to the authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.shoppingMallWishlistId },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Default pagination setup: page 1 and 100 items per page
  const page = (props.body.page ?? 1) satisfies number as number;
  const limit = (props.body.limit ?? 100) satisfies number as number;
  const skip = (page - 1) * limit;

  // Build the where clause for Prisma
  const whereClause = {
    shopping_mall_wishlist_id: props.shoppingMallWishlistId,
    deleted_at: null as null,
  };

  // Apply search filter if provided
  if (props.body.search) {
    // As we do not have details on searchable fields, we skip this in this implementation
  }

  // Apply orderBy if provided
  const orderBy = props.body.sort_by
    ? {
        [props.body.sort_by]: (props.body.order === "asc"
          ? "asc"
          : "desc") satisfies "asc" | "desc" as "asc" | "desc",
      }
    : { created_at: "desc" as "desc" };

  // Query total count and data in parallel
  const [total, data] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.count({ where: whereClause }),
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderBy,
    }),
  ]);

  // Map to ISummary type with proper date conversion
  const summaries = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    shopping_mall_wishlist_id: item.shopping_mall_wishlist_id as string &
      tags.Format<"uuid">,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  }));

  // Return paginated response
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
