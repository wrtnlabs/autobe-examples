import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Ensure the cart belongs to the authenticated customer
  const cart = await MyGlobal.prisma.shopping_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart) throw new HttpException("Cart not found", 404);
  if (cart.shopping_customer_id !== props.customer.id)
    throw new HttpException("Forbidden: You do not own this cart", 403);

  // 2. Find the item within the cart
  const item = await MyGlobal.prisma.shopping_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_cart_id: props.cartId,
    },
  });
  if (!item) throw new HttpException("Cart item not found in this cart", 404);

  // 3. Delete the shopping_cart_items record
  await MyGlobal.prisma.shopping_cart_items.delete({
    where: { id: props.itemId },
  });
}
