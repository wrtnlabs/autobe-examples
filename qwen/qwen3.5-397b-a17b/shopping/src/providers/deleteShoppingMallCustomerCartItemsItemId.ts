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

export async function deleteShoppingMallCustomerCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.itemId,
      deleted_at: null,
      cart: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
    },
  });
  if (!cartItem) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: {
      id: props.itemId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
