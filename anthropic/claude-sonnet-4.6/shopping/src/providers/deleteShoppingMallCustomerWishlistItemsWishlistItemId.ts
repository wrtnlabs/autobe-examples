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

export async function deleteShoppingMallCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the wishlist item by its primary key only (no customer filter)
  // This lets us distinguish between "not found" (graceful no-op) and "wrong owner" (403)
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
    where: { id: props.wishlistItemId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  // Graceful no-op: item does not exist (may have been removed already or auto-cleaned)
  if (item === null) {
    return;
  }
  // Ownership check: item belongs to a different customer → 403 Forbidden
  if (item.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the record — cascade handles any dependent rows automatically
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: { id: props.wishlistItemId },
  });
}
