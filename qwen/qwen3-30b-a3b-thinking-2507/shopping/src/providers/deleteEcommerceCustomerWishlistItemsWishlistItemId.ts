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

export async function deleteEcommerceCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingItem =
    await MyGlobal.prisma.ecommerce_wishlist_items.findUnique({
      where: {
        id: props.wishlistItemId,
        customer: { id: props.customer.id },
        deleted_at: null,
      },
    });
  if (!existingItem) {
    throw new HttpException("Wishlist item not found", 404);
  }
  await MyGlobal.prisma.ecommerce_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
