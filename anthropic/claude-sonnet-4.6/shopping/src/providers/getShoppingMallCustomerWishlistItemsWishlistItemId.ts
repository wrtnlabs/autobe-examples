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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  // Step 1: fetch the record with minimal select to verify ownership (404 if not found)
  const ownership =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      select: { shopping_mall_customer_id: true },
    });
  // Step 2: verify that this wishlist item belongs to the requesting customer
  if (ownership.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: fetch the full record using the transformer's select
  const record =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      ...ShoppingMallWishlistItemTransformer.select(),
    });
  // Step 4: transform and return
  return ShoppingMallWishlistItemTransformer.transform(record);
}
