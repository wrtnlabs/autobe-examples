import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingWishlist.IUpdate;
}): Promise<IShoppingWishlist> {
  // Fetch the wishlist for ownership check
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      shopping_customer_id: true,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Wishlist does not belong to current customer",
      403,
    );
  }
  // Update only updated_at per API spec
  await MyGlobal.prisma.shopping_wishlists.update({
    where: { id: props.wishlistId },
    data: { updated_at: props.body.updated_at },
  });
  // Fetch wishlist again with items and related SKUs
  const result = await MyGlobal.prisma.shopping_wishlists.findUnique({
    where: { id: props.wishlistId },
    include: {
      shopping_wishlist_items: {
        include: {
          sku: true,
        },
      },
    },
  });
  if (!result) {
    throw new HttpException("Wishlist not found after update", 404);
  }
  return {
    id: result.id,
    shopping_customer_id: result.shopping_customer_id,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    items: result.shopping_wishlist_items.map((item) => ({
      id: item.id,
      sku: {
        id: item.sku.id,
        sku_code: item.sku.sku_code,
        price: item.sku.price,
        is_active: item.sku.is_active,
        status: item.sku.status,
      },
      added_at: toISOStringSafe(item.added_at),
    })),
  };
}
