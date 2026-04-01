import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.body.product_id },
    select: { id: true, deleted_at: true },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or deleted", 404);
  }
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existing) {
    throw new HttpException("Product already exists in wishlist", 409);
  }
  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: await ShoppingMallWishlistItemCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
    }),
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  return await ShoppingMallWishlistItemTransformer.transform(created);
}
