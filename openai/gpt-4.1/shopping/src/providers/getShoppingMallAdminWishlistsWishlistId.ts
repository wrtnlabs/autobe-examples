import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminWishlistsWishlistId(props: {
  admin: AdminPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }

  return {
    id: wishlist.id,
    customer: {
      id: wishlist.customer.id,
      name: wishlist.customer.name,
    },
    created_at: toISOStringSafe(wishlist.created_at),
    updated_at: toISOStringSafe(wishlist.updated_at),
  };
}
