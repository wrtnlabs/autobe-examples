import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      customer: {
        id: props.customer.id,
      },
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
      where: {
        wishlist: {
          id: props.wishlistId,
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.delete({
      where: {
        id: props.wishlistId,
      },
    }),
  ]);
}
