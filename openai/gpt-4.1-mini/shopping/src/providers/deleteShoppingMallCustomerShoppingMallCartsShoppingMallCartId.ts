import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCartsShoppingMallCartId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.shoppingMallCartId },
  });

  if (!cart) {
    throw new HttpException("Shopping mall cart not found", 404);
  }

  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_carts.delete({
    where: { id: props.shoppingMallCartId },
  });
}
