import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingWishlist> {
  // Fetch wishlist by ID, verify ownership
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: {
      id: true,
      shopping_customer_id: true,
      created_at: true,
      updated_at: true,
      // REMOVED deleted_at field (does not exist)
    },
  });
  if (!wishlist || wishlist.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or not accessible", 404);
  }

  // Fetch wishlist items, ordered by added_at asc
  const wishlistItems = await MyGlobal.prisma.shopping_wishlist_items.findMany({
    where: { shopping_wishlist_id: props.wishlistId },
    orderBy: { added_at: "asc" },
  });

  // Get all relevant SKUs for summary
  const skuIds = wishlistItems.map((item) => item.shopping_sku_id);
  const skus = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: skuIds } },
  });

  // Map SKU summaries by ID
  const skuMap: Record<string, IShoppingSku.ISummary> = {};
  for (const sku of skus) {
    skuMap[sku.id] = {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    };
  }

  // Build item list for response
  const items: IShoppingWishlistItem[] = wishlistItems.map((item) => {
    return {
      id: item.id,
      sku: skuMap[item.shopping_sku_id],
      added_at: toISOStringSafe(item.added_at),
      // note: wishlist item 'note' does not exist in schema
    };
  });

  // Return assembled response
  return {
    id: wishlist.id,
    shopping_customer_id: wishlist.shopping_customer_id,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    items,
  };
}
