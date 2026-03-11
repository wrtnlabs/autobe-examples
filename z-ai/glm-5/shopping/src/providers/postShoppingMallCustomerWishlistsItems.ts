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
  // 1. Validate product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.body.productId,
      deleted_at: null,
    },
  });
  // 2. Resolve customer's wishlist (create if not exists)
  let wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (wishlist === null) {
    wishlist = await MyGlobal.prisma.shopping_mall_wishlists.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // 3. Check for duplicate
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        shopping_mall_wishlist_id: wishlist.id,
        shopping_mall_product_id: props.body.productId,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // 4. Create wishlist item using Collector
  const createInput = await ShoppingMallWishlistItemCollector.collect({
    body: props.body,
    shoppingMallCustomers: { id: props.customer.id },
    shoppingMallCustomerSessions: { id: props.customer.session_id },
    shoppingMallWishlists: { id: wishlist.id },
  });
  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: createInput,
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  // 5. Update wishlist timestamp
  await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: wishlist.id },
    data: { updated_at: new Date() },
  });
  // 6. Transform and return
  return await ShoppingMallWishlistItemTransformer.transform(created);
}
