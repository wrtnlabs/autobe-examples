import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerBuyersMeWishlistItemsWishlistItemId(props: {
  buyer: BuyerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: {
        id: props.wishlistItemId,
      },
    });

  if (!wishlistItem || wishlistItem.deleted_at !== null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: {
      id: props.wishlistItemId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
