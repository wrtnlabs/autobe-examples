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

export async function putShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.shoppingMallWishlistId },
  });

  if (!existing) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: props.shoppingMallWishlistId },
    data: {
      deleted_at: props.body.deleted_at ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
