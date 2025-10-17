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
  const { customer, wishlistId, itemId } = props;

  // Step 1: Verify wishlist exists and belongs to authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Authorization check: verify customer owns the wishlist
  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only remove items from your own wishlists",
      403,
    );
  }

  // Step 2: Verify wishlist item exists and belongs to the specified wishlist
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_wishlist_id: wishlistId,
      },
    });

  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // Step 3: Perform hard delete (no soft delete available in schema)
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: itemId,
    },
  });
}
