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

export async function postShoppingMallCustomerShoppingMallWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
