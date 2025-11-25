import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the cart exists and is owned by customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Cart not found or not owned by the customer.",
      404,
    );
  }

  // 2. Verify the cart item exists and belongs to the specified cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.itemId },
  });
  if (!cartItem || cartItem.shopping_mall_cart_id !== props.cartId) {
    throw new HttpException("Cart item not found in the specified cart.", 404);
  }

  // 3. Delete the cart item
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: props.itemId },
  });
}
