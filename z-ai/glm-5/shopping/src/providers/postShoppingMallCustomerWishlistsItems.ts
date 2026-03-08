import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallWishlistItemCollector } from "../collectors/ShoppingMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerWishlistsItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: Get customer's wishlist (one-to-one relationship)
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { shopping_mall_customer_id: props.customer.id },
    });
  // Step 2: Validate product exists with active seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
    },
    select: {
      id: true,
      seller: {
        select: {
          id: true,
          suspended: true,
          banned: true,
        },
      },
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller.suspended || product.seller.banned) {
    throw new HttpException("Seller is not available", 403);
  }
  // Step 3: Check for duplicate in wishlist
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        shopping_mall_wishlist_id: wishlist.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Step 4: Create wishlist item using collector
  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: await ShoppingMallWishlistItemCollector.collect({
      body: props.body,
      shoppingMallWishlists: { id: wishlist.id },
    }),
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  // Step 5: Update wishlist updated_at timestamp
  await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: wishlist.id },
    data: { updated_at: new Date() },
  });
  // Step 6: Return transformed result
  return await ShoppingMallWishlistItemTransformer.transform(created);
}
