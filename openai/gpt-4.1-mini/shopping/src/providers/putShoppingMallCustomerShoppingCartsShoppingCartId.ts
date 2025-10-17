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

export async function putShoppingMallCustomerShoppingCartsShoppingCartId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingCart.IUpdate;
}): Promise<IShoppingMallShoppingCart> {
  const { customer, shoppingCartId, body } = props;

  // Fetch cart that is not soft deleted
  const cart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: {
        id: shoppingCartId,
        deleted_at: null,
      },
    });

  if (cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this shopping cart",
      403,
    );
  }

  // Current timestamp
  const now = toISOStringSafe(new Date());

  // Update record
  const updated_cart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.update({
      where: { id: shoppingCartId },
      data: {
        shopping_mall_customer_id:
          body.shopping_mall_customer_id !== undefined
            ? body.shopping_mall_customer_id
            : undefined,
        session_id: body.session_id !== undefined ? body.session_id : undefined,
        updated_at: now,
      },
    });

  return {
    id: updated_cart.id,
    shopping_mall_customer_id:
      updated_cart.shopping_mall_customer_id === null
        ? null
        : updated_cart.shopping_mall_customer_id,
    session_id:
      updated_cart.session_id === null ? null : updated_cart.session_id,
    created_at: toISOStringSafe(updated_cart.created_at),
    updated_at: toISOStringSafe(updated_cart.updated_at),
    deleted_at:
      updated_cart.deleted_at === null
        ? null
        : toISOStringSafe(updated_cart.deleted_at),
  };
}
