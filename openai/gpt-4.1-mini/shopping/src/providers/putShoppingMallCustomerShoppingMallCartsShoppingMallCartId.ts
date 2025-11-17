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

export async function putShoppingMallCustomerShoppingMallCartsShoppingMallCartId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCart.IUpdate;
}): Promise<IShoppingMallCart> {
  const existing = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.shoppingMallCartId },
  });

  if (!existing) {
    throw new HttpException("ShoppingMallCart not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.shoppingMallCartId },
    data: {
      deleted_at: props.body.deleted_at ?? null,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id === null
        ? undefined
        : updated.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
  };
}
