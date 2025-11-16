import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallWishlistItemOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemOptions";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Validate wishlist ownership
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!wishlist || wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Wishlist not found or access forbidden", 404);
  }

  // Retrieve wishlist item without relations due to schema restrictions
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
      select: {
        id: true,
        shopping_mall_wishlist_id: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (
    !wishlistItem ||
    wishlistItem.shopping_mall_wishlist_id !== props.wishlistId
  ) {
    throw new HttpException("Wishlist item not found or access forbidden", 404);
  }

  // Map prisma result to IShoppingMallWishlistItem with available data
  return {
    id: wishlistItem.id,
    wishlist_id:
      wishlistItem.shopping_mall_wishlist_id satisfies string as string &
        tags.Format<"uuid">,
    product_id:
      wishlistItem.shopping_mall_product_id satisfies string as string &
        tags.Format<"uuid">,
    quantity: 0, // 'quantity' not available on wishlistItem, so defaulting to 0
    options: undefined,
    created_at: toISOStringSafe(wishlistItem.created_at),
    updated_at: toISOStringSafe(wishlistItem.updated_at),
    customer: {
      id: props.customer.id satisfies string as string & tags.Format<"uuid">,
      email: "",
      name: "",
      status: "active",
      created_at: "",
      updated_at: undefined,
    },
    product: {
      id: wishlistItem.shopping_mall_product_id satisfies string as string &
        tags.Format<"uuid">,
      code: "",
      name: "",
      is_active: true,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    },
  } satisfies IShoppingMallWishlistItem;
}
