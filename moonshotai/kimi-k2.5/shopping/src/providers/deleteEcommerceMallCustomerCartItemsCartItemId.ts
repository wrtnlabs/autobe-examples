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

export async function deleteEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
}): Promise<void> {
  // Find the cart item and verify it exists and is not deleted
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
  // 404 if cart item not found or already deleted
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  // 403 if cart item belongs to different customer (Section 367: Cart Access Boundary Enforcement)
  if (cartItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete by setting deleted_at to current timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: {
      id: props.cartItemId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
