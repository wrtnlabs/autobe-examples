import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallWishlistItemCollector } from "../collectors/EcommerceMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem> {
  // Validate product exists - throws 404 if not found
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.body.product_id },
  });
  // Check for existing wishlist item (duplicate prevention - idempotent)
  const existing =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
      },
      ...EcommerceMallWishlistItemTransformer.select(),
    });
  if (existing !== null) {
    return await EcommerceMallWishlistItemTransformer.transform(existing);
  }
  // Create new wishlist item
  const created = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: await EcommerceMallWishlistItemCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
    }),
    ...EcommerceMallWishlistItemTransformer.select(),
  });
  return await EcommerceMallWishlistItemTransformer.transform(created);
}
