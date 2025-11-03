import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string;
  itemId: string;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, itemId, body } = props;

  // Verify the wishlist belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Verify the wishlist item exists and belong to the wishlist
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
      where: {
        id: itemId,
        shopping_mall_wishlist_id: wishlistId,
        deleted_at: null,
      },
    });

  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // Update the wishlist item quantity
  const updated = await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: itemId },
    data: { quantity: body.quantity },
  });

  return {
    id: updated.id,
    shopping_mall_wishlist_id: updated.shopping_mall_wishlist_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
