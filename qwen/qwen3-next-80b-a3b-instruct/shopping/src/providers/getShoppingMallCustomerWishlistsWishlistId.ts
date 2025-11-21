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

export async function getShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      shopping_mall_wishlist_items: {
        where: {
          deleted_at: null,
        },
        select: {
          shopping_mall_product_variant_id: true,
          created_at: true,
          updated_at: true,
          note: true,
        },
        orderBy: {
          created_at: "asc",
        },
      },
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  return {
    name: wishlist.name,
  };
}
