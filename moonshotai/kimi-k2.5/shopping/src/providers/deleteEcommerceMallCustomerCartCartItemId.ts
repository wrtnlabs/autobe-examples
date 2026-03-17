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

export async function deleteEcommerceMallCustomerCartCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Look up the cart item by id
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      deleted_at: null,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // Return 404 if cart item not found or already deleted
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Verify ownership - customer can only delete their own cart items
  if (cartItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: {
      id: props.cartItemId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
