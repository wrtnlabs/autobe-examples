import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, wishlistId } = props;

  // Fetch the wishlist
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: wishlistId },
    });

  // Authorization check - verify ownership
  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own wishlists",
      403,
    );
  }

  // Check if already deleted
  if (wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist is already deleted", 400);
  }

  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: wishlistId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
