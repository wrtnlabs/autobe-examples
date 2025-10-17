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
  const { body } = props;

  const existedCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        id: body.shopping_mall_customer_id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true },
    });

  if (existedCustomer === null) {
    throw new HttpException("Customer does not exist or is not active", 403);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: body.shopping_mall_customer_id as string &
        tags.Format<"uuid">,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_customer_id: created.shopping_mall_customer_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
