import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingCartsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, id } = props;

  // Find the shopping cart to verify existence and ownership
  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
    where: { id },
    select: { id: true, shopping_mall_customer_id: true },
  });

  if (!cart) {
    throw new HttpException("Shopping cart not found", 404);
  }

  if (cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You do not own this shopping cart",
      403,
    );
  }

  // Hard delete the shopping cart
  await MyGlobal.prisma.shopping_mall_shopping_carts.delete({
    where: { id },
  });
}
