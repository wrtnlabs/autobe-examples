import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallWishlist> {
  const { customer } = props;

  if (!customer.id || !customer.session_id) {
    throw new HttpException(
      "Invalid customer payload: missing id or session_id",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customer.id,
      shopping_mall_customer_session_id: customer.session_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      created.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
    shopping_mall_wishlist_items: undefined,
  };
}
