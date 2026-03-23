import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the cart item and verify it exists and is not already deleted
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: {
        id: props.cartItemId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });
  // Verify ownership - customer must own this cart item
  if (cartItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft deletion by setting deleted_at to current timestamp
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      deleted_at: new Date(),
    },
  });
}
