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

export async function getShoppingMallCustomerShoppingMallCartsShoppingMallCartId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCart> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.shoppingMallCartId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (!cart) {
    throw new HttpException("Shopping mall cart not found", 404);
  }

  return {
    id: cart.id,
    shopping_mall_customer_session_id:
      cart.shopping_mall_customer_session_id ?? undefined,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    deleted_at:
      cart.deleted_at === null ? null : toISOStringSafe(cart.deleted_at),
    shopping_mall_customer_id: cart.shopping_mall_customer_id,
  };
}
