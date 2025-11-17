import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistIdShoppingMallWishlistItemsShoppingMallWishlistItemId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  shoppingMallWishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  // Removed invalid property 'shopping_mall_wishlist' nested filter
  const exist = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
    where: {
      id: props.shoppingMallWishlistItemId,
      shopping_mall_wishlist_id: props.shoppingMallWishlistId,
      deleted_at: null,
    },
  });

  if (exist === null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: props.shoppingMallWishlistItemId },
    data: {
      ...props.body,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    shopping_mall_wishlist_id: updated.shopping_mall_wishlist_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
