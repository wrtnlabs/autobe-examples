import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, wishlistItemId } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      deleted_at: null,
      shopping_mall_customer_id: customer.id,
    },
    select: {
      id: true,
    },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found or access forbidden", 404);
  }

  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
      where: {
        id: wishlistItemId,
        shopping_mall_wishlist_id: wishlistId,
        deleted_at: null,
      },
    });

  if (wishlistItem === null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  return {
    id: wishlistItem.id,
    shopping_mall_wishlist_id: wishlistItem.shopping_mall_wishlist_id,
    shopping_mall_sku_id: wishlistItem.shopping_mall_sku_id,
    created_at: toISOStringSafe(wishlistItem.created_at),
    updated_at: toISOStringSafe(wishlistItem.updated_at),
    deleted_at:
      wishlistItem.deleted_at === null || wishlistItem.deleted_at === undefined
        ? undefined
        : toISOStringSafe(wishlistItem.deleted_at),
  };
}
