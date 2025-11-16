import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string;
  wishlistItemId: string;
}): Promise<void> {
  // Check if the wishlist item exists and belongs to the customer
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: { shopping_mall_wishlist_id: true },
    });

  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.shopping_mall_wishlist_id !== props.wishlistId) {
    throw new HttpException(
      "Wishlist item does not belong to the specified wishlist",
      400,
    );
  }

  // Verify ownership of the wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { shopping_mall_customer_id: true },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform delete
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: { id: props.wishlistItemId },
  });
}
