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
import { ShoppingMallWishlistCollector } from "../collectors/ShoppingMallWishlistCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistAtSummaryTransformer } from "../transformers/ShoppingMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersMeWishlist(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist.ISummary> {
  // Validate product exists and is not deleted, include seller relation
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.product_id },
    select: {
      id: true,
      deleted_at: true,
      seller: {
        select: {
          approval_status: true,
        },
      },
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Check seller is not suspended
  if (product.seller?.approval_status === "suspended") {
    throw new HttpException("Product seller is suspended", 400);
  }
  // Check wishlist limit (max 200)
  const currentCount = await MyGlobal.prisma.shopping_mall_wishlists.count({
    where: { customer_id: props.customer.id },
  });
  if (currentCount >= 200) {
    throw new HttpException("Wishlist limit reached (200 products)", 400);
  }
  // Check if already in wishlist (upsert pattern)
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      customer_id_product_id: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
      },
    },
    ...ShoppingMallWishlistAtSummaryTransformer.select(),
  });
  if (existing !== null) {
    return await ShoppingMallWishlistAtSummaryTransformer.transform(existing);
  }
  // Create new wishlist entry
  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: await ShoppingMallWishlistCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...ShoppingMallWishlistAtSummaryTransformer.select(),
  });
  return await ShoppingMallWishlistAtSummaryTransformer.transform(created);
}
