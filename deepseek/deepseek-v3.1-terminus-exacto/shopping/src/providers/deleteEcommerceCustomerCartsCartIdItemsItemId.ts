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

export async function deleteEcommerceCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the cart belongs to the authenticated customer
  const cart = await MyGlobal.prisma.ecommerce_shopping_carts.findFirst({
    where: {
      id: props.cartId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found or access denied", 404);
  }
  // Then, find the cart item and verify it belongs to this cart
  const cartItem = await MyGlobal.prisma.ecommerce_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_cart_id: props.cartId,
      deleted_at: null,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_cart_items.update({
    where: { id: props.itemId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
