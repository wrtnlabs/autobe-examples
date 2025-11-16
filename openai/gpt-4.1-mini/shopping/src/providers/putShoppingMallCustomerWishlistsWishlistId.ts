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

export async function putShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  // Find the existing wishlist owned by the customer and not soft deleted
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });

  if (!existing) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted wishlist", 400);
  }

  // Update only provided fields (name)
  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    customer_id: updated.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    name: updated.name,
    status: "active" as IShoppingMallWishlist["status"],
    deleted_at:
      updated.deleted_at === null
        ? null
        : (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">),
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
  };
}
