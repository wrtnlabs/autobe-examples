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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerWishlistItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string;
}): Promise<IEcommerceMallWishlistItem> {
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistItemId },
      ...EcommerceMallWishlistItemTransformer.select(),
    });
  if (wishlistItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallWishlistItemTransformer.transform(wishlistItem);
}
