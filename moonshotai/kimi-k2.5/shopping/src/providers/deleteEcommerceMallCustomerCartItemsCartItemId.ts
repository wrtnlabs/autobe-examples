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
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: { id: true, customer_id: true },
    });
  if (cartItem.customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to delete this cart item",
      403,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: { deleted_at: new Date() },
  });
}
