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

export async function deleteShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string;
}): Promise<void> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Cart access denied", 403);
  }
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
