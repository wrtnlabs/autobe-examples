import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingCartsShoppingCartId(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the shopping cart exists and belongs to the authenticated customer
  const cart = await MyGlobal.prisma.shopping_mall_shopping_carts.findUnique({
    where: { id: props.shoppingCartId },
    select: { shopping_mall_customer_id: true },
  });

  if (cart === null) {
    throw new HttpException("Shopping cart not found", 404);
  }

  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Cannot delete shopping cart owned by another customer",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_shopping_carts.delete({
    where: { id: props.shoppingCartId },
  });
}
