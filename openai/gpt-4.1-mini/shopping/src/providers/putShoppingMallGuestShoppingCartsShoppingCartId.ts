import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function putShoppingMallGuestShoppingCartsShoppingCartId(props: {
  guest: GuestPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallShoppingCart.IUpdate;
}): Promise<IShoppingMallShoppingCart> {
  const { guest, shoppingCartId, body } = props;

  // 1. Find existing shopping cart with soft delete check
  const existingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: { id: shoppingCartId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        session_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // 2. Authorization check: guest can update only if owns the cart via session_id equal to guest's id
  if (existingCart.session_id !== guest.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own shopping cart",
      403,
    );
  }

  // 3. Prepare updated_at timestamp
  const updatedAt = toISOStringSafe(new Date());

  // 4. Update shopping cart with provided fields and updated_at
  const updated = await MyGlobal.prisma.shopping_mall_shopping_carts.update({
    where: { id: shoppingCartId },
    data: {
      shopping_mall_customer_id: body.shopping_mall_customer_id ?? null,
      session_id: body.session_id ?? null,
      updated_at: updatedAt,
    },
  });

  // 5. Return updated cart with proper ISO date strings, deleted_at properly handled
  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id ?? null,
    session_id: updated.session_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
