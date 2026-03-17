import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function getEcommerceMallCustomerWishlistWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallWishlistItem> {
  const wishlistItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        ...EcommerceMallWishlistItemTransformer.select().select,
        customer_id: true,
      },
    });
  if (wishlistItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallWishlistItemTransformer.transform(wishlistItem);
}
