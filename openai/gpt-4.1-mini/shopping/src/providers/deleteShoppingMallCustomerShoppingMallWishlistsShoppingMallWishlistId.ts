import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallWishlistsShoppingMallWishlistId(props: {
  customer: CustomerPayload;
  shoppingMallWishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.shoppingMallWishlistId },
  });

  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: You do not own this wishlist", 403);
  }

  await MyGlobal.prisma.shopping_mall_wishlists.delete({
    where: { id: props.shoppingMallWishlistId },
  });
}
