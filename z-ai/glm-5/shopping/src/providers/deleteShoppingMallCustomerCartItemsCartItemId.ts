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
  // Find the cart item with its cart to verify ownership
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        shopping_mall_cart_id: true,
        cart: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  // Verify ownership - cart must belong to authenticated customer
  if (cartItem.cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete cart item and update cart timestamp atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_cart_items.delete({
      where: { id: props.cartItemId },
    }),
    MyGlobal.prisma.shopping_mall_carts.update({
      where: { id: cartItem.shopping_mall_cart_id },
      data: {
        updated_at: new Date(),
      },
    }),
  ]);
}
