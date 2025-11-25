import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  // Validate that the wishlist exists and belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      customer: {
        id: props.customer.id,
      },
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // Validate that the wishlist item exists and belongs to the wishlist
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: {
      id: props.itemId,
      wishlist: {
        id: props.wishlistId,
      },
    },
  });

  if (!item) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // Update the note and set updatedAt timestamp
  const updatedItem = await MyGlobal.prisma.shopping_mall_wishlist_items.update(
    {
      where: { id: props.itemId },
      data: {
        note: props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  // Return the updated item with proper date-time formatting
  return {
    id: updatedItem.id,
    customerId: updatedItem.shopping_mall_wishlist_id,
    wishlistId: updatedItem.shopping_mall_wishlist_id,
    productVariantId: updatedItem.shopping_mall_product_variant_id,
    note: updatedItem.note,
    createdAt: toISOStringSafe(updatedItem.created_at),
    updatedAt: updatedItem.updated_at
      ? toISOStringSafe(updatedItem.updated_at)
      : undefined,
  };
}
