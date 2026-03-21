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

export async function deleteEcommerceMallCustomerCustomersCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      ecommerce_mall_cart_id: true,
    },
  });
  if (!cartItem) {
    throw new HttpException("Not Found", 404);
  }
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findUnique({
    where: { id: cartItem.ecommerce_mall_cart_id },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  if (!cart || cart.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
    where: { id: props.itemId },
  });
}
