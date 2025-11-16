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
  // Step 1: Find wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });

  // Step 2: Not found - 404
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Step 3: Ownership check
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You are not authorized to delete this wishlist",
      403,
    );
  }

  // Step 4: Delete wishlist (hard delete, no soft delete, cascading wishlist items)
  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.wishlistId },
  });

  // Step 5: Return void (API contract)
  return;
}
