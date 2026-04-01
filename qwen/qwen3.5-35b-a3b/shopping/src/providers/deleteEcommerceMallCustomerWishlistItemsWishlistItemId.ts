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
  // Verify the wishlist item exists and get owner information
  const item =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
    });
  // Verify the item belongs to this customer (ownership check)
  if (item.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete by marking deleted_at timestamp (atomically)
  await MyGlobal.prisma.ecommerce_mall_wishlist_items.update({
    where: { id: props.wishlistItemId, customer_id: props.customer.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
