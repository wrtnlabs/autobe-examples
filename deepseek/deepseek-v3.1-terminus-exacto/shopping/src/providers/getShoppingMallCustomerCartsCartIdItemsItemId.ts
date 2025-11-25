import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  // First verify the cart exists and belongs to the customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }

  // Then retrieve the specific cart item
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_mall_cart_id: props.cartId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  // Convert Date objects to ISO strings and return
  return {
    id: cartItem.id,
    shopping_mall_cart_id: cartItem.shopping_mall_cart_id,
    shopping_mall_product_variant_id: cartItem.shopping_mall_product_variant_id,
    quantity: cartItem.quantity,
    unit_price: cartItem.unit_price,
    added_at: toISOStringSafe(cartItem.added_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    notes: cartItem.notes ?? undefined,
  };
}
