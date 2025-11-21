import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  // First verify the cart exists, belongs to the authenticated customer, and is active
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!cart) {
    throw new HttpException(
      "Cart not found, access denied, or cart is not active",
      404,
    );
  }

  // Verify the cart item exists and belongs to the specified cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_cart_id: props.cartId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found in the specified cart", 404);
  }

  // Perform hard delete of the cart item
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: {
      id: props.itemId,
    },
  });
}
