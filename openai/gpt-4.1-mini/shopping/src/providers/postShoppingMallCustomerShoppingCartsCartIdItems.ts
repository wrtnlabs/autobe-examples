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

export async function postShoppingMallCustomerShoppingCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, body } = props;

  // Verify the shopping cart belongs to the authenticated customer
  const cart =
    await MyGlobal.prisma.shopping_mall_shopping_carts.findUniqueOrThrow({
      where: { id: cartId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        deleted_at: true,
      },
    });

  if (cart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: Shopping cart does not belong to customer",
      403,
    );
  }

  if (cart.deleted_at !== null) {
    throw new HttpException("Forbidden: Shopping cart has been deleted", 403);
  }

  // Verify that SKU exists and is not soft deleted
  const sku =
    await MyGlobal.prisma.shopping_mall_product_skus.findUniqueOrThrow({
      where: { id: body.shopping_mall_product_sku_id },
      select: {
        id: true,
        deleted_at: true,
      },
    });

  if (sku.deleted_at !== null) {
    throw new HttpException("SKU is deleted and cannot be added to cart", 400);
  }

  // Create new cart item
  const now = toISOStringSafe(new Date());
  const newCartItemId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: newCartItemId,
      shopping_mall_shopping_cart_id: cartId,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      quantity: body.quantity,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_shopping_cart_id: created.shopping_mall_shopping_cart_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
