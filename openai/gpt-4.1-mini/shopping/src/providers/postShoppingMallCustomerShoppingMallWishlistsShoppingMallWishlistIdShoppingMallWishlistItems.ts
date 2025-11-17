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

export async function postShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistIdShoppingMallWishlistItems(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // Verify wishlist ownership
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.shoppingMallWishlistId },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Verify product variant existence
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shoppingMallProductVariantId },
    });

  if (!productVariant) {
    throw new HttpException("Product variant not found", 400);
  }

  // Create a new wishlist item
  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: {
      id,
      shopping_mall_wishlist_id: props.shoppingMallWishlistId,
      shopping_mall_product_variant_id: props.body.shoppingMallProductVariantId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_wishlist_id: created.shopping_mall_wishlist_id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
