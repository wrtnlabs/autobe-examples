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

export async function postShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  const { customer, body } = props;

  const now = toISOStringSafe(new Date());
  const wishlistId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: wishlistId,
    name: body.name,
  };
}
