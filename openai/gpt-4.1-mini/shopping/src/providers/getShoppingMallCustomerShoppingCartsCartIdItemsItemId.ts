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

export async function getShoppingMallCustomerShoppingCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, itemId } = props;

  // Verify the cart belongs to this customer
  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
    where: { id: cartId },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!cart || cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not have access to this cart",
      403,
    );
  }

  // Retrieve the cart item within the cart
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: itemId },
  });

  if (!cartItem || cartItem.shopping_mall_shopping_cart_id !== cartId) {
    throw new HttpException("Not Found: Cart item not found in your cart", 404);
  }

  // Convert Date objects to ISO string format with proper null handling
  const created_at = toISOStringSafe(cartItem.created_at);
  const updated_at = toISOStringSafe(cartItem.updated_at);
  const deleted_at = cartItem.deleted_at
    ? toISOStringSafe(cartItem.deleted_at)
    : undefined;

  return {
    id: cartItem.id,
    shopping_mall_shopping_cart_id: cartItem.shopping_mall_shopping_cart_id,
    shopping_mall_product_sku_id: cartItem.shopping_mall_product_sku_id,
    quantity: cartItem.quantity,
    created_at,
    updated_at,
    deleted_at,
  };
}
