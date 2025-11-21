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

export async function getShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_wishlist_id: props.wishlistId,
      deleted_at: null,
    },
    include: {},
  });

  if (!item) {
    throw new HttpException("Wishlist item not found", 404);
  }

  // Fetch the product variant separately using the ID from the item
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: item.shopping_mall_product_variant_id,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant is unavailable", 404);
  }

  return {
    id: item.id,
    customerId: props.customer.id,
    wishlistId: item.shopping_mall_wishlist_id,
    productVariantId: item.shopping_mall_product_variant_id,
    note: item.note,
    createdAt: toISOStringSafe(item.created_at),
    updatedAt: item.updated_at ? toISOStringSafe(item.updated_at) : undefined,
  };
}
