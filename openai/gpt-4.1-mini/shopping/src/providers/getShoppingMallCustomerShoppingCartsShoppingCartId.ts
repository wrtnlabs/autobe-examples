import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingCartsShoppingCartId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShoppingCart> {
  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: props.shoppingCartId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_customer_session_id: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!shoppingCart) {
    throw new HttpException("Shopping cart not found", 404);
  }

  if (shoppingCart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: shoppingCart.id,
    customer_id:
      shoppingCart.shopping_mall_customer_id satisfies string as string &
        tags.Format<"uuid">,
    session_id:
      shoppingCart.shopping_mall_customer_session_id === null
        ? null
        : (shoppingCart.shopping_mall_customer_session_id ?? undefined),
    created_at: toISOStringSafe(shoppingCart.created_at),
    updated_at: toISOStringSafe(shoppingCart.updated_at),
    status: "active",
  };
}
