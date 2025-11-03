import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingWishlistItem> {
  // 1. Verify the wishlist exists and is owned by the customer
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!wishlist || wishlist.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // 2. Get the wishlist item inside this wishlist
  const item = await MyGlobal.prisma.shopping_wishlist_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      shopping_wishlist_id: true,
      shopping_sku_id: true,
      added_at: true,
    },
  });
  if (!item || item.shopping_wishlist_id !== props.wishlistId) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // 3. Get the SKU summary
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: item.shopping_sku_id },
    select: {
      id: true,
      sku_code: true,
      price: true,
      is_active: true,
      status: true,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found for wishlist item", 404);
  }

  // 4. Compose return object with strict typing, no native Date or as
  return {
    id: item.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    added_at: toISOStringSafe(item.added_at),
    // 'note' property not accessed or spread since it does not exist in type
  };
}
