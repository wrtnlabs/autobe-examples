import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCartsCartIdCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify cart exists and belongs to authenticated customer
  const cart = await MyGlobal.prisma.ecommerce_mall_shopping_carts.findUnique({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  // Verify cart item exists, belongs to cart, and is not already deleted
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      cart_id: props.cartId,
      deleted_at: null,
    },
  });
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Soft delete cart item and update timestamps
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: {
      id: props.cartItemId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Update cart timestamp
  await MyGlobal.prisma.ecommerce_mall_shopping_carts.update({
    where: {
      id: props.cartId,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return;
}
