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
  // Find the wishlist entry - will throw 404 if not found
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: { customer_id: true },
    });
  // Verify ownership - throw 403 if not the owner
  if (wishlist.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the wishlist entry
  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.wishlistId },
  });
}
