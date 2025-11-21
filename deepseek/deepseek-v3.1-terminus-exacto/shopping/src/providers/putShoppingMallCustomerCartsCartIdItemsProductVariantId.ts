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

export async function putShoppingMallCustomerCartsCartIdItemsProductVariantId(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  productVariantId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // First, verify the cart exists and belongs to the customer
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      id: props.cartId,
      shopping_mall_customer_session_id: props.customer.session_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!cart) {
    throw new HttpException(
      "Cart not found or you don't have permission to modify it",
      404,
    );
  }

  // Check if cart is expired using string comparison
  const currentTime = toISOStringSafe(new Date());
  const expiresAtString = toISOStringSafe(cart.expires_at);
  if (expiresAtString < currentTime) {
    throw new HttpException("Cart has expired", 410);
  }

  // Find the cart item using the composite unique constraint
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
    where: {
      shopping_mall_cart_id: props.cartId,
      shopping_mall_product_variant_id: props.productVariantId,
    },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  // Update the cart item with the provided data
  const updated = await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: {
      id: cartItem.id,
    },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      ...(props.body.notes !== undefined && { notes: props.body.notes }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated cart item with proper type conversion
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
