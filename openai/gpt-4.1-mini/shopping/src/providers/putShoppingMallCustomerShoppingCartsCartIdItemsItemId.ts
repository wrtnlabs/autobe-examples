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

export async function putShoppingMallCustomerShoppingCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const { customer, cartId, itemId, body } = props;

  // Fetch the cart item with relations to verify ownership
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: itemId },
    include: {
      shoppingCart: true,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  if (cartItem.shopping_mall_shopping_cart_id !== cartId) {
    throw new HttpException(
      "Cart item does not belong to the specified cart",
      403,
    );
  }

  if (cartItem.shoppingCart.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Unauthorized to modify this cart item", 403);
  }

  if (body.quantity < 1) {
    throw new HttpException("Quantity must be at least 1", 400);
  }

  // Update the cart item quantity and updated_at
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: itemId },
    data: {
      quantity: body.quantity,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    shopping_mall_shopping_cart_id: updated.shopping_mall_shopping_cart_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
