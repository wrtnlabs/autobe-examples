import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check that wishlist exists and owned by customer
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_customer_id: true },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your wishlist", 403);
  }

  // 2. Check that the wishlist item exists and belongs to the specified wishlist
  const item = await MyGlobal.prisma.shopping_wishlist_items.findUnique({
    where: { id: props.itemId },
    select: { id: true, shopping_wishlist_id: true },
  });
  if (!item) {
    throw new HttpException("Wishlist item not found", 404);
  }
  if (item.shopping_wishlist_id !== props.wishlistId) {
    throw new HttpException(
      "Item does not belong to the specified wishlist",
      404,
    );
  }

  // 3. Delete the wishlist item (hard delete)
  await MyGlobal.prisma.shopping_wishlist_items.delete({
    where: { id: props.itemId },
  });
}
