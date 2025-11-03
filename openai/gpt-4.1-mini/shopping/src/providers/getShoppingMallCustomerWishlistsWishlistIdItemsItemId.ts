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

export async function getShoppingMallCustomerWishlistsWishlistIdItemsItemId(props: {
  customer: CustomerPayload;
  wishlistId: string;
  itemId: string;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, itemId } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: wishlistId },
  });

  if (
    !wishlist ||
    wishlist.shopping_mall_customer_id !== customer.id ||
    wishlist.deleted_at !== null
  ) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  const item = await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
    where: { id: itemId },
    include: { productSku: true, wishlist: true },
  });

  if (
    !item ||
    item.shopping_mall_wishlist_id !== wishlistId ||
    item.deleted_at !== null
  ) {
    throw new HttpException("Wishlist item not found or access denied", 404);
  }

  return {
    id: item.id,
    shopping_mall_wishlist_id: item.shopping_mall_wishlist_id,
    shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
    quantity: item.quantity,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    productSku: item.productSku
      ? {
          id: item.productSku.id,
          sku_code: item.productSku.sku_code,
          price: item.productSku.price,
          attributes_json:
            item.productSku.attributes_json === null
              ? null
              : item.productSku.attributes_json,
          created_at: toISOStringSafe(item.productSku.created_at),
          updated_at: toISOStringSafe(item.productSku.updated_at),
        }
      : undefined,
    wishlist: item.wishlist
      ? {
          id: item.wishlist.id,
          shopping_mall_customer_id: item.wishlist.shopping_mall_customer_id,
          shopping_mall_customer_session_id:
            item.wishlist.shopping_mall_customer_session_id,
          created_at: toISOStringSafe(item.wishlist.created_at),
          updated_at: toISOStringSafe(item.wishlist.updated_at),
          deleted_at: item.wishlist.deleted_at
            ? toISOStringSafe(item.wishlist.deleted_at)
            : null,
          shopping_mall_wishlist_items: [],
        }
      : undefined,
  };
}
