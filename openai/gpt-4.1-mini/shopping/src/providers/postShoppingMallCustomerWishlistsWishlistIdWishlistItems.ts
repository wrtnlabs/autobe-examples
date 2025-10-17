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

export async function postShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: wishlistId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not the owner of the wishlist", 403);
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: body.shopping_mall_sku_id },
    select: { id: true },
  });

  if (sku === null) {
    throw new HttpException("SKU not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const createdItem = await MyGlobal.prisma.shopping_mall_wishlist_items.create(
    {
      data: {
        id: v4(),
        shopping_mall_wishlist_id: wishlistId,
        shopping_mall_sku_id: body.shopping_mall_sku_id,
        created_at: body.created_at ?? now,
        updated_at: body.updated_at ?? now,
        deleted_at: body.deleted_at ?? null,
      },
    },
  );

  return {
    id: createdItem.id,
    shopping_mall_wishlist_id: createdItem.shopping_mall_wishlist_id,
    shopping_mall_sku_id: createdItem.shopping_mall_sku_id,
    created_at: toISOStringSafe(createdItem.created_at),
    updated_at: toISOStringSafe(createdItem.updated_at),
    deleted_at:
      createdItem.deleted_at !== null
        ? toISOStringSafe(createdItem.deleted_at)
        : null,
  };
}
