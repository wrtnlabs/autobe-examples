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

export async function deleteShoppingCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingWishlist> {
  // Verify wishlist exists and belongs to customer
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_customer_id: props.customer.id,
    },
    select: {
      id: true,
      shopping_customer_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found or not owned by customer", 404);
  }
  // Hard delete since soft-delete field does not exist
  await MyGlobal.prisma.shopping_wishlists.delete({
    where: { id: props.wishlistId },
  });

  // Load all wishlist items (for audit/response)
  const items = await MyGlobal.prisma.shopping_wishlist_items.findMany({
    where: { shopping_wishlist_id: props.wishlistId },
    select: {
      id: true,
      shopping_sku_id: true,
      added_at: true,
    },
  });

  // Load all referenced skus in one query
  const skuIds = items.map((item) => item.shopping_sku_id);
  const skuRecords = await MyGlobal.prisma.shopping_skus.findMany({
    where: { id: { in: skuIds } },
    select: {
      id: true,
      sku_code: true,
      price: true,
      is_active: true,
      status: true,
    },
  });
  const skuMap = new Map(skuRecords.map((sku) => [sku.id, sku]));

  return {
    id: wishlist.id,
    shopping_customer_id: wishlist.shopping_customer_id,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    items: items.map((item) => {
      const sku = skuMap.get(item.shopping_sku_id);
      return {
        id: item.id,
        sku: sku
          ? {
              id: sku.id,
              sku_code: sku.sku_code,
              price: sku.price,
              is_active: sku.is_active,
              status: sku.status,
            }
          : ({} as IShoppingSku.ISummary),
        added_at: toISOStringSafe(item.added_at),
      };
    }),
  };
}
