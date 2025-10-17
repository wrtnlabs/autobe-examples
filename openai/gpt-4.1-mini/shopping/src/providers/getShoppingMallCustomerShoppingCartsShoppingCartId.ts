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
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: { id: props.shoppingCartId },
      include: {
        shopping_mall_cart_items: {
          where: { deleted_at: null },
          include: { sku: true },
        },
      },
    });

  if (shoppingCart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Access denied to this shopping cart",
      403,
    );
  }

  return {
    id: shoppingCart.id,
    shopping_mall_customer_id: shoppingCart.shopping_mall_customer_id ?? null,
    session_id: shoppingCart.session_id ?? null,
    created_at: toISOStringSafe(shoppingCart.created_at),
    updated_at: toISOStringSafe(shoppingCart.updated_at),
    deleted_at: shoppingCart.deleted_at
      ? toISOStringSafe(shoppingCart.deleted_at)
      : null,
  };
}
