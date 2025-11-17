import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerShoppingMallCartsShoppingMallCartIdShoppingMallCartItemsShoppingMallCartItemId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  shoppingMallCartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const found = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.shoppingMallCartItemId,
      shopping_mall_cart_id: props.shoppingMallCartId,
      deleted_at: null,
    },
  });

  if (found === null) {
    throw new HttpException("Shopping mall cart item not found", 404);
  }

  return {
    id: found.id,
    shopping_mall_cart_id: found.shopping_mall_cart_id,
    shopping_mall_product_variant_id: found.shopping_mall_product_variant_id,
    quantity: found.quantity,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at:
      found.deleted_at === null ? null : toISOStringSafe(found.deleted_at),
  };
}
