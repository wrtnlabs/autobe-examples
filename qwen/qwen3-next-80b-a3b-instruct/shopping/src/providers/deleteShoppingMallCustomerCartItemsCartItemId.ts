import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
}): Promise<void> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.cartItemId,
      customer: { id: props.customer.id },
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: {
      id: props.cartItemId,
    },
  });
}
