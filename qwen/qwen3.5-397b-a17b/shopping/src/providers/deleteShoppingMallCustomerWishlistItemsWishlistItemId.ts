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
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        customer_id: true,
        deleted_at: true,
      },
    });
  if (!wishlistItem) {
    throw new HttpException("Not Found", 404);
  }
  if (wishlistItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (wishlistItem.deleted_at) {
    throw new HttpException("Already Deleted", 404);
  }
  await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.wishlistItemId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
