import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // First verify the wishlist exists and belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Verify ownership - customer can only delete their own wishlists
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own wishlists",
      403,
    );
  }

  // Perform hard delete operation
  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.wishlistId },
  });
}
