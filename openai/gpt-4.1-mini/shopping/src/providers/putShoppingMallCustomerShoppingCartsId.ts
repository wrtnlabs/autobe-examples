import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingCartsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingCart.IUpdate;
}): Promise<IShoppingMallShoppingCart> {
  const { customer, id, body } = props;

  const existingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
      where: { id, deleted_at: null },
    });

  if (!existingCart) {
    throw new HttpException("Shopping cart not found or deleted", 404);
  }

  if (existingCart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized to update this shopping cart", 403);
  }

  const now = toISOStringSafe(new Date());

  const newCustomerId =
    body.shopping_mall_customer_id ?? existingCart.shopping_mall_customer_id;
  const newSessionId =
    body.shopping_mall_customer_session_id ??
    existingCart.shopping_mall_customer_session_id;

  if (
    newCustomerId !== existingCart.shopping_mall_customer_id ||
    newSessionId !== existingCart.shopping_mall_customer_session_id
  ) {
    const duplicateCart =
      await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
        where: {
          shopping_mall_customer_id: newCustomerId,
          shopping_mall_customer_session_id: newSessionId,
          deleted_at: null,
          NOT: { id },
        },
      });

    if (duplicateCart) {
      throw new HttpException(
        "Another shopping cart with the same customer and session exists",
        409,
      );
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_shopping_carts.update({
    where: { id },
    data: {
      shopping_mall_customer_id: body.shopping_mall_customer_id ?? undefined,
      shopping_mall_customer_session_id:
        body.shopping_mall_customer_session_id ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
