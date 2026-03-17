import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerWishlistEntriesWishlistEntryId(props: {
  customer: CustomerPayload;
  wishlistEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlistEntry =
    await MyGlobal.prisma.shopping_mall_wishlist_entries.findFirstOrThrow({
      where: {
        id: props.wishlistEntryId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });
  if (wishlistEntry.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_wishlist_entries.update({
    where: {
      id: wishlistEntry.id,
    },
    data: {
      updated_at: new Date(),
      deleted_at: new Date(),
    },
  });
}
