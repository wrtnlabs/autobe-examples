import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.ICreate;
}): Promise<IShoppingMallCart> {
  const now = new Date();
  const expiresAt = toISOStringSafe(now);

  const cart = await MyGlobal.prisma.shopping_mall_carts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: props.customer.id,
      status: "active",
      expires_at: expiresAt,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    status: typia.assert<"active" | "expired" | "checked_out">(cart.status),
    expires_at: toISOStringSafe(cart.expires_at),
  };
}
