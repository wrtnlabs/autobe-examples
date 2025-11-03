import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCartItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingCartItem> {
  const { customer, cartId, itemId } = props;

  const cartItem = await MyGlobal.prisma.shopping_cart_items.findUnique({
    where: {
      id: itemId,
      shopping_cart_id: cartId,
    },
    include: {
      sku: true,
      cart: {
        include: { customer: true },
      },
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  if (!cartItem.cart || cartItem.cart.shopping_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You may only access your own cart items",
      403,
    );
  }
  if (!cartItem.cart.customer) {
    throw new HttpException("Cart owner not found", 404);
  }
  if (!cartItem.sku) {
    throw new HttpException("Cart item SKU missing", 500);
  }

  const errorFlags: string[] = [];
  if (!cartItem.sku.is_active) errorFlags.push("sku_inactive");
  if (cartItem.sku.status !== "in_stock") errorFlags.push("unavailable_status");

  return {
    id: cartItem.id,
    shopping_cart_id: cartItem.shopping_cart_id,
    sku: {
      id: cartItem.sku.id,
      sku_code: cartItem.sku.sku_code,
      price: cartItem.sku.price,
      is_active: cartItem.sku.is_active,
      status: cartItem.sku.status,
    },
    quantity: cartItem.quantity,
    added_at: toISOStringSafe(cartItem.added_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    cart_owner: {
      id: cartItem.cart.customer.id,
      name: cartItem.cart.customer.name,
      email: cartItem.cart.customer.email,
      is_active: cartItem.cart.customer.is_active,
      created_at: toISOStringSafe(cartItem.cart.customer.created_at),
      deleted_at: cartItem.cart.customer.deleted_at
        ? toISOStringSafe(cartItem.cart.customer.deleted_at)
        : null,
    },
    error_flags: errorFlags.length > 0 ? errorFlags : undefined,
  };
}
