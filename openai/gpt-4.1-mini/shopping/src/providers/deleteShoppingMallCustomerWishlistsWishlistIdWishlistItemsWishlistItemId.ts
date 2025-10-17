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
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, wishlistItemId } = props;

  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: wishlistItemId },
      include: { wishlist: true },
    });

  if (wishlistItem === null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Wishlist item does not belong to customer",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: { id: wishlistItemId },
  });
}
