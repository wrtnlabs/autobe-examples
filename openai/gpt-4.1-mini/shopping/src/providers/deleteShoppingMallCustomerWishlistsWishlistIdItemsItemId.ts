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
  wishlistId: string;
  itemId: string;
}): Promise<void> {
  const { customer, wishlistId, itemId } = props;

  // Verify wishlist exists and belongs to the customer
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findFirstOrThrow({
      where: {
        id: wishlistId,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    });

  // Verify wishlist item exists and belongs to the wishlist
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirstOrThrow({
      where: {
        id: itemId,
        shopping_mall_wishlist_id: wishlist.id,
        deleted_at: null,
      },
    });

  // Perform hard delete of the wishlist item
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: itemId,
    },
  });
}
