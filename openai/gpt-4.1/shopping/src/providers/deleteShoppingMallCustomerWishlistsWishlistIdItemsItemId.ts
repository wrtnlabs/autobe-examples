import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Ensure the wishlist exists and belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // Ensure the item exists and belongs to the wishlist
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_wishlist_id: props.wishlistId,
    },
  });
  if (!item) {
    throw new HttpException(
      "Wishlist item not found or does not belong to wishlist",
      404,
    );
  }

  // Delete the wishlist item
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: props.itemId,
      shopping_mall_wishlist_id: props.wishlistId,
    },
  });
}
