import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.shoppingMallWishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }

  return {
    id: wishlist.id,
    shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    deleted_at: wishlist.deleted_at
      ? toISOStringSafe(wishlist.deleted_at)
      : null,
  };
}
