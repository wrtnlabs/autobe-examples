import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_wishlist_id: props.wishlistId,
    },
  });

  if (!item) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (item.deleted_at !== null) {
    throw new HttpException("Wishlist item already deleted", 410);
  }

  // Verify ownership: item must belong to customer's wishlist
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      customer: {
        id: props.customer.id,
      },
    },
  });

  if (!wishlist) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.itemId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
