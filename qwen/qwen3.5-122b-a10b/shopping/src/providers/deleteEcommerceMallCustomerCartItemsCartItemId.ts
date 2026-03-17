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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find cart item and verify it belongs to the authenticated customer
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
    where: {
      id: props.cartItemId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  // Cart item not found or already deleted or belongs to another customer
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  // Soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: { deleted_at: new Date() },
  });
}
