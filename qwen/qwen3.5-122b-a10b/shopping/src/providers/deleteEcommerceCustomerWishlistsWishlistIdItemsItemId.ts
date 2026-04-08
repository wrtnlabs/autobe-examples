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

export async function deleteEcommerceCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate wishlist ownership
  const wishlist = await MyGlobal.prisma.ecommerce_wishlists.findUniqueOrThrow({
    where: { id: props.wishlistId },
    select: { ecommerce_customer_id: true },
  });
  if (wishlist.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Validate the wishlist item exists
  const item = await MyGlobal.prisma.ecommerce_wishlist_items.findUniqueOrThrow(
    {
      where: { id: props.itemId },
      select: { ecommerce_wishlist_id: true, deleted_at: true },
    },
  );
  // Step 3: Verify item belongs to this wishlist
  if (item.ecommerce_wishlist_id !== props.wishlistId) {
    throw new HttpException("Not Found", 404);
  }
  // Step 4: Check if item is already soft-deleted
  if (item.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 5: Perform soft delete
  await MyGlobal.prisma.ecommerce_wishlist_items.update({
    where: { id: props.itemId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
