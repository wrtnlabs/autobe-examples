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

export async function deleteEcommerceCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string;
}): Promise<void> {
  // Check if cart exists and is associated with current user
  const cart = await MyGlobal.prisma.ecommerce_carts.findUnique({
    where: {
      id: props.cartId,
      customer: { id: props.customer.id },
      deleted_at: null,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  // Soft-delete the cart
  await MyGlobal.prisma.ecommerce_carts.update({
    where: { id: props.cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
