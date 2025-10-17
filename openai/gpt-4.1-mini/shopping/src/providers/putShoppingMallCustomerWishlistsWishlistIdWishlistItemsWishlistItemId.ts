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

export async function putShoppingMallCustomerWishlistsWishlistIdWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IUpdate;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, wishlistItemId, body } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: wishlistId },
    select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
  });

  if (!wishlist || wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized: You don't own this wishlist", 403);
  }

  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: wishlistItemId },
      select: { id: true, shopping_mall_wishlist_id: true, deleted_at: true },
    });

  if (!wishlistItem || wishlistItem.deleted_at !== null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.shopping_mall_wishlist_id !== wishlistId) {
    throw new HttpException("Wishlist item does not belong to wishlist", 400);
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: body.shopping_mall_sku_id },
    select: { id: true, deleted_at: true },
  });

  if (!sku || sku.deleted_at !== null) {
    throw new HttpException("SKU not found or deleted", 404);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_wishlist_items.update({
    where: { id: wishlistItemId },
    data: {
      shopping_mall_wishlist_id: body.shopping_mall_wishlist_id,
      shopping_mall_sku_id: body.shopping_mall_sku_id,
      deleted_at:
        body.deleted_at === undefined ? undefined : (body.deleted_at ?? null),
      created_at: body.created_at,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_wishlist_id: updated.shopping_mall_wishlist_id,
    shopping_mall_sku_id: updated.shopping_mall_sku_id,
    deleted_at:
      updated.deleted_at === undefined || updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
