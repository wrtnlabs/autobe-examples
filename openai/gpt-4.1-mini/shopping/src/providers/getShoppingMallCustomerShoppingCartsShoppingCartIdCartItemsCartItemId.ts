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

export async function getShoppingMallCustomerShoppingCartsShoppingCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const { customer, shoppingCartId, cartItemId } = props;

  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
      where: { id: shoppingCartId },
      select: { shopping_mall_customer_id: true },
    });
  if (!shoppingCart) {
    throw new HttpException("Shopping cart not found", 404);
  }
  if (shoppingCart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: This shopping cart does not belong to you",
      403,
    );
  }

  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: cartItemId,
      shopping_mall_shopping_cart_id: shoppingCartId,
      deleted_at: null,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  return {
    id: cartItem.id,
    shopping_mall_shopping_cart_id: cartItem.shopping_mall_shopping_cart_id,
    shopping_mall_sku_id: cartItem.shopping_mall_sku_id,
    quantity: cartItem.quantity,
    created_at: toISOStringSafe(cartItem.created_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    deleted_at: cartItem.deleted_at
      ? toISOStringSafe(cartItem.deleted_at)
      : null,
  };
}
