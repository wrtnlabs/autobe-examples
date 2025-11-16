import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartsCartId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });

  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }

  // Allow deletion only if this cart belongs to the authenticated customer
  if (cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("You are not the owner of this cart", 403);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
      where: { shopping_mall_cart_id: props.cartId },
    }),
    MyGlobal.prisma.shopping_mall_carts.delete({
      where: { id: props.cartId },
    }),
  ]);
}
