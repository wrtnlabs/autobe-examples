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

export async function putShoppingMallCustomerShoppingMallCartsShoppingMallCartIdShoppingMallCartItemsShoppingMallCartItemId(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  shoppingMallCartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const existing = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      id: props.shoppingMallCartItemId,
      shopping_mall_cart_id: props.shoppingMallCartId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Shopping mall cart item not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.shoppingMallCartItemId },
    data: {
      quantity: props.body.quantity,
      shopping_mall_product_variant_id: props.body.shoppingMallProductVariantId,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_cart_id: updated.shopping_mall_cart_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
