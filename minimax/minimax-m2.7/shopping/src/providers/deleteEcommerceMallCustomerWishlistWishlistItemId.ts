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

export async function deleteEcommerceMallCustomerWishlistWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query wishlist item with its parent wishlist to verify ownership
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        wishlist: {
          select: {
            id: true,
            shopping_customer_id: true,
          },
        },
      },
    });
  // If wishlist item not found, return 404
  if (wishlistItem === null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify ownership - wishlist must belong to authenticated customer
  if (wishlistItem.wishlist.shopping_customer_id !== props.customer.id) {
    // Return same 404 to prevent information leakage about other customers' wishlists
    throw new HttpException("Not Found", 404);
  }
  // Delete the wishlist item
  await MyGlobal.prisma.ecommerce_mall_wishlist_items.delete({
    where: { id: props.wishlistItemId },
  });
}
