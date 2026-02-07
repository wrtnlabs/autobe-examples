import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string;
}): Promise<void> {
  // Verify wishlist entry exists and belongs to the authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  // Check if wishlist entry exists
  if (!wishlist || wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist item not found", 404);
  }
  // Delete the wishlist entry
  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.wishlistId },
  });
}
