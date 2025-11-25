import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistIdShoppingMallWishlistItemsShoppingMallWishlistItemId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  shoppingMallWishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.shoppingMallWishlistId,
    },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found", 404);
  }

  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: {
        id: props.shoppingMallWishlistItemId,
      },
    });

  if (
    !wishlistItem ||
    wishlistItem.shopping_mall_wishlist_id !== props.shoppingMallWishlistId
  ) {
    throw new HttpException("Wishlist item not found", 404);
  }

  return {
    id: wishlistItem.id,
    shopping_mall_wishlist_id: wishlistItem.shopping_mall_wishlist_id,
    shopping_mall_product_variant_id:
      wishlistItem.shopping_mall_product_variant_id,
    created_at: toISOStringSafe(wishlistItem.created_at),
    updated_at: toISOStringSafe(wishlistItem.updated_at),
    deleted_at:
      wishlistItem.deleted_at === null || wishlistItem.deleted_at === undefined
        ? undefined
        : toISOStringSafe(wishlistItem.deleted_at),
  };
}
