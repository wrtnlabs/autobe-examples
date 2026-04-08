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

export async function deleteEcommerceMallCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the wishlist item and verify it belongs to the customer
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        id: props.wishlistItemId,
        customer_id: props.customer.id,
      },
    });
  if (wishlistItem === null) {
    throw new HttpException("Wishlist item not found", 404);
  }
  // Delete the wishlist item
  await MyGlobal.prisma.ecommerce_mall_wishlist_items.delete({
    where: {
      id: props.wishlistItemId,
    },
  });
}
