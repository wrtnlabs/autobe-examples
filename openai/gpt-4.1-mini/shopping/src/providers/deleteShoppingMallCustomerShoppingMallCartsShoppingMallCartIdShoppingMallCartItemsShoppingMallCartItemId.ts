import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCartsShoppingMallCartIdShoppingMallCartItemsShoppingMallCartItemId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  shoppingMallCartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.shoppingMallCartItemId,
      shopping_mall_cart_id: props.shoppingMallCartId,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Shopping cart item not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: props.shoppingMallCartItemId },
  });
}
