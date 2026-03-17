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

export async function postShoppingMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: Verify the product exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Check if a wishlist item already exists for this (customer, product) pair
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.shopping_mall_product_id,
      },
      ...ShoppingMallWishlistItemTransformer.select(),
    },
  );
  // Step 3: If already exists, return it without creating a duplicate
  if (existing !== null) {
    return ShoppingMallWishlistItemTransformer.transform(existing);
  }
  // Step 4: Create the new wishlist item
  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: await ShoppingMallWishlistItemCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  return ShoppingMallWishlistItemTransformer.transform(created);
}
