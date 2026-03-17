import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistEntryTransformer } from "../transformers/ShoppingMallWishlistEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerWishlistEntriesWishlistEntryId(props: {
  customer: CustomerPayload;
  wishlistEntryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistEntry> {
  const wishlistEntry =
    await MyGlobal.prisma.shopping_mall_wishlist_entries.findFirstOrThrow({
      where: {
        id: props.wishlistEntryId,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
        product: {
          deleted_at: null,
        },
      },
      ...ShoppingMallWishlistEntryTransformer.select(),
    });
  return await ShoppingMallWishlistEntryTransformer.transform(wishlistEntry);
}
