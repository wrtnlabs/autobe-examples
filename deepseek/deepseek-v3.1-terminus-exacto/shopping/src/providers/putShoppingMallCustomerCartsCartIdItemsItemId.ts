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

export async function putShoppingMallCustomerCartsCartIdItemsItemId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Verify cart exists, belongs to customer, and is active
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!cart) {
    throw new HttpException("Cart not found or not active", 404);
  }

  // Verify cart item exists in the cart
  const existingItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst(
    {
      where: {
        id: props.itemId,
        shopping_mall_cart_id: props.cartId,
      },
    },
  );

  if (!existingItem) {
    throw new HttpException("Cart item not found", 404);
  }

  // Update the cart item with inline parameters
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.itemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated item with proper formatting
  return {
    id: updated.id,
    shopping_mall_cart_id: updated.shopping_mall_cart_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    added_at: toISOStringSafe(updated.added_at),
    updated_at: toISOStringSafe(updated.updated_at),
    notes: updated.notes ?? undefined,
  };
}
