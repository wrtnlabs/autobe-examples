import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistTransformer } from "../transformers/ShoppingMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string;
}): Promise<IShoppingMallWishlist> {
  const ownership =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: { customer_id: true },
    });
  if (ownership.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      ...ShoppingMallWishlistTransformer.select(),
    });
  return await ShoppingMallWishlistTransformer.transform(wishlist);
}
