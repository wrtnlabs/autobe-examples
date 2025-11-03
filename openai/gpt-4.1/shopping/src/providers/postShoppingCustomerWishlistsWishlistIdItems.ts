import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingWishlistItem.ICreate;
}): Promise<IShoppingWishlistItem> {
  const { customer, wishlistId, body } = props;

  // 1. Verify wishlist ownership
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: wishlistId },
    select: { shopping_customer_id: true },
  });
  if (!wishlist || wishlist.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "Wishlist does not exist or does not belong to authenticated customer.",
      404,
    );
  }
  // 2. Look up SKU by sku_code, must be active
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: body.sku_code },
    select: {
      id: true,
      sku_code: true,
      price: true,
      is_active: true,
      status: true,
    },
  });
  if (!sku || !sku.is_active) {
    throw new HttpException("SKU does not exist or is not active.", 404);
  }
  // 3. Check for existing wishlist item for sku
  const duplicate = await MyGlobal.prisma.shopping_wishlist_items.findFirst({
    where: {
      shopping_wishlist_id: wishlistId,
      shopping_sku_id: sku.id,
    },
  });
  if (duplicate) {
    throw new HttpException("This SKU is already in the wishlist.", 409);
  }
  // 4. Insert wishlist item
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_wishlist_items.create({
    data: {
      id: v4(),
      shopping_wishlist_id: wishlistId,
      shopping_sku_id: sku.id,
      added_at: now,
      // note field is not set, since not present in API body
    },
    select: {
      id: true,
      added_at: true,
    },
  });
  // 5. Return correct shape for IShoppingWishlistItem
  return {
    id: created.id,
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      price: sku.price,
      is_active: sku.is_active,
      status: sku.status,
    },
    added_at: toISOStringSafe(created.added_at),
    // note: undefined (optional)
  };
}
