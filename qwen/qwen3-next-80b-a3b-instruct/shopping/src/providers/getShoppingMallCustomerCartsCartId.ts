import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: {
      id: props.cartId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }

  return {
    status: cart.status satisfies string as
      | "active"
      | "expired"
      | "checked_out",
    expires_at: toISOStringSafe(cart.expires_at),
  };
}
