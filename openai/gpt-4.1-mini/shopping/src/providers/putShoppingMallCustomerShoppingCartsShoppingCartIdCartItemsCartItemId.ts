import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingCartsShoppingCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const { customer, shoppingCartId, cartItemId, body } = props;

  // Find the cart item with ownership verification via shopping cart's customer
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: cartItemId,
      shopping_mall_shopping_cart_id: shoppingCartId,
      deleted_at: null,
    },
  });

  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }

  // Verify that the shopping cart belongs to the customer
  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: shoppingCartId },
      select: { shopping_mall_customer_id: true },
    });

  if (
    shoppingCart === null ||
    shoppingCart.shopping_mall_customer_id !== customer.id
  ) {
    throw new HttpException("Shopping cart not found or unauthorized", 404);
  }

  // Proceed to update
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: cartItemId },
    data: {
      quantity: body.quantity,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated item with proper date formatting
  return {
    id: updated.id,
    shopping_mall_shopping_cart_id: updated.shopping_mall_shopping_cart_id,
    shopping_mall_sku_id: updated.shopping_mall_sku_id,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
