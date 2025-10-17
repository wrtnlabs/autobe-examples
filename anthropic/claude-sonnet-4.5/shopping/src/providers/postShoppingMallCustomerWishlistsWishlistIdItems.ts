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

export async function postShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;

  // Verify wishlist exists and belongs to authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException(
      "Wishlist not found or you do not have permission to modify it",
      404,
    );
  }

  // Verify SKU exists and is active
  const sku = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      id: body.shopping_mall_sku_id,
      is_active: true,
    },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found or is not available", 404);
  }

  // Check for duplicate SKU in wishlist
  const existingItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
      where: {
        shopping_mall_wishlist_id: wishlistId,
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      },
    });

  if (existingItem) {
    throw new HttpException("This product is already in your wishlist", 409);
  }

  // Create wishlist item
  const now = toISOStringSafe(new Date());
  const itemId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: {
      id: itemId,
      shopping_mall_wishlist_id: wishlistId,
      shopping_mall_sku_id: body.shopping_mall_sku_id,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    created_at: now,
  };
}
