import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const { customer, id } = props;
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id },
    });

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: Access denied to this wishlist",
      403,
    );
  }

  return {
    id: wishlist.id,
    shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      wishlist.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
    deleted_at: wishlist.deleted_at
      ? toISOStringSafe(wishlist.deleted_at)
      : null,
  };
}
