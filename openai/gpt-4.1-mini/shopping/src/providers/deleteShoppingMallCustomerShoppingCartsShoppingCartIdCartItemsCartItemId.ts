import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingCartsShoppingCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify shopping cart ownership
  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: props.shoppingCartId },
      select: { shopping_mall_customer_id: true },
    });

  if (!shoppingCart) {
    throw new HttpException("Shopping cart not found", 404);
  }

  if (shoppingCart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Unauthorized: You do not own this shopping cart",
      403,
    );
  }

  // Step 2: Verify cart item exists and belongs to this shopping cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: { shopping_mall_shopping_cart_id: true },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  if (cartItem.shopping_mall_shopping_cart_id !== props.shoppingCartId) {
    throw new HttpException(
      "Unauthorized: The cart item does not belong to your shopping cart",
      403,
    );
  }

  // Step 3: Delete cart item (hard delete)
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: props.cartItemId },
  });
}
