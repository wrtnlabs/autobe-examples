import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string;
}): Promise<void> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: {
      id: props.wishlistId,
    },
  });
}
