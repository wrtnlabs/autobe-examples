import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCartsShoppingMallCartIdShoppingMallCartItems(props: {
  customer: CustomerPayload;
  shoppingMallCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.shoppingMallCartId },
    select: { id: true, shopping_mall_customer_id: true, deleted_at: true },
  });

  if (
    cart === null ||
    cart.deleted_at !== null ||
    cart.shopping_mall_customer_id !== props.customer.id
  ) {
    throw new HttpException("Shopping cart not found or access denied", 404);
  }

  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.body.shoppingMallProductVariantId },
      select: { id: true, deleted_at: true },
    });

  if (productVariant === null || productVariant.deleted_at !== null) {
    throw new HttpException("Product variant not found", 404);
  }

  const now = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_cart_id: props.shoppingMallCartId,
      shopping_mall_product_variant_id: props.body.shoppingMallProductVariantId,
      quantity: props.body.quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_cart_id: created.shopping_mall_cart_id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    quantity: created.quantity,
    created_at: toISOStringSafe(created.created_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    deleted_at:
      created.deleted_at !== null
        ? (toISOStringSafe(created.deleted_at) satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">)
        : null,
  };
}
