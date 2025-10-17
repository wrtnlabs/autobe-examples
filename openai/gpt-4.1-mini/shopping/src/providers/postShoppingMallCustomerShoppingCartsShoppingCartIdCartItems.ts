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

export async function postShoppingMallCustomerShoppingCartsShoppingCartIdCartItems(props: {
  customer: CustomerPayload;
  shoppingCartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const { customer, shoppingCartId, body } = props;

  const shoppingCart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: { id: shoppingCartId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });

  if (shoppingCart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Cannot add items to another customer's cart",
      403,
    );
  }

  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: body.shopping_mall_sku_id },
    select: { id: true, deleted_at: true },
  });

  if (!sku || sku.deleted_at !== null) {
    throw new HttpException("SKU not found or deleted", 404);
  }

  if (body.quantity <= 0) {
    throw new HttpException("Quantity must be positive", 400);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id,
      shopping_mall_shopping_cart_id: shoppingCartId,
      shopping_mall_sku_id: body.shopping_mall_sku_id,
      quantity: body.quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_shopping_cart_id: shoppingCartId,
    shopping_mall_sku_id: created.shopping_mall_sku_id,
    quantity: created.quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
