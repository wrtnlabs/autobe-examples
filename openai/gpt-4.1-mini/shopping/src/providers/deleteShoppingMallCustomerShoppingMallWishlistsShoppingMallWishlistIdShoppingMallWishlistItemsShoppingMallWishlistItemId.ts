import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistIdShoppingMallWishlistItemsShoppingMallWishlistItemId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  shoppingMallWishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.shoppingMallWishlistId,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: {
        id: props.shoppingMallWishlistItemId,
      },
    });

  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.shopping_mall_wishlist_id !== props.shoppingMallWishlistId) {
    throw new HttpException(
      "Wishlist item does not belong to the specified wishlist",
      404,
    );
  }

  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: props.shoppingMallWishlistItemId,
    },
  });
}
