import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const record = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (!record) {
    throw new HttpException("Wishlist not found.", 404);
  }

  return {
    id: record.id,
    customer_id: record.shopping_mall_customer_id,
    name: record.name,
    // Omitting status because it does not exist on the record type
    status: "active", // Assuming default status as 'active' since it's missing
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
