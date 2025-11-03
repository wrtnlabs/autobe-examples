import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, cartId, itemId } = props;

  // Verify cart ownership
  const cart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: { id: cartId },
    });
  if (
    cart.shopping_mall_customer_id !== customer.id ||
    cart.deleted_at !== null
  ) {
    throw new HttpException("Shopping cart not found or unauthorized", 404);
  }

  // Verify cart item exists
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: itemId },
    });
  if (cartItem.shopping_mall_shopping_cart_id !== cartId) {
    throw new HttpException("Cart item not found", 404);
  }

  // Hard delete
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: itemId },
  });
}
