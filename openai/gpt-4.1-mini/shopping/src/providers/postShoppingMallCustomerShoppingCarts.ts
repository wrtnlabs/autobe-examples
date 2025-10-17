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

export async function postShoppingMallCustomerShoppingCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallShoppingCart.ICreate;
}): Promise<IShoppingMallShoppingCart> {
  const { body } = props;

  const customerId = body.shopping_mall_customer_id ?? null;
  const sessionId = body.session_id ?? null;

  if (customerId === null && sessionId === null) {
    throw new HttpException(
      "Either shopping_mall_customer_id or session_id must be provided",
      400,
    );
  }

  const existingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findFirst({
      where: {
        OR: [
          ...(customerId !== null
            ? [{ shopping_mall_customer_id: customerId }]
            : []),
          ...(sessionId !== null ? [{ session_id: sessionId }] : []),
        ],
      },
    });

  if (existingCart !== null) {
    throw new HttpException(
      "A shopping cart already exists for this customer or session",
      409,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_shopping_carts.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: customerId,
      session_id: sessionId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id ?? undefined,
    session_id: created.session_id ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
