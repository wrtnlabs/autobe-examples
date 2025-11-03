import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IPageIShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingWishlistItem.IRequest;
}): Promise<IPageIShoppingWishlistItem> {
  const { customer, wishlistId, body } = props;
  // Step 1: Ownership enforcement.
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: wishlistId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!wishlist || wishlist.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized access to wishlist or wishlist not found",
      403,
    );
  }
  // Step 2: Pagination and sorting options.
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 3: Sorting logic.
  let orderBy: object = { added_at: "desc" };
  if (body.sort_by === "sku_code")
    orderBy = {
      sku: { sku_code: body.sort_direction === "asc" ? "asc" : "desc" },
    };
  else if (body.sort_by === "product_name")
    orderBy = { sku: { name: body.sort_direction === "asc" ? "asc" : "desc" } };
  else if (body.sort_direction === "asc") orderBy = { added_at: "asc" };
  // Step 4: Filtering/search.
  const search = body.search?.trim();
  const wishlistItemWhere = {
    shopping_wishlist_id: wishlistId,
    ...(search && {
      OR: [
        { sku: { sku_code: { contains: search } } },
        { sku: { name: { contains: search } } },
      ],
    }),
  };
  // Step 5: Count for pagination.
  const total = await MyGlobal.prisma.shopping_wishlist_items.count({
    where: wishlistItemWhere,
  });
  // Step 6: Fetch items (wishlist_items + SKU summary join).
  const items = await MyGlobal.prisma.shopping_wishlist_items.findMany({
    where: wishlistItemWhere,
    orderBy,
    skip,
    take: limit,
    include: {
      sku: true,
    },
  });
  const data = items.map((item) => ({
    id: item.id,
    sku: {
      id: item.sku.id,
      sku_code: item.sku.sku_code,
      price: item.sku.price,
      is_active: item.sku.is_active,
      status: item.sku.status,
    },
    added_at: toISOStringSafe(item.added_at),
    // note field removed; not present in Prisma shopping_wishlist_items model
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
