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

export async function postShoppingMallCustomerCartsCartIdItems(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  // Verify cart exists and belongs to the customer
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
      "Shopping cart not found or you don't have permission to access it",
      404,
    );
  }

  // Check if cart is expired using string comparison
  const currentTime = toISOStringSafe(new Date());
  if (toISOStringSafe(cart.expires_at) < currentTime) {
    throw new HttpException("Shopping cart has expired", 410);
  }

  // Verify product variant exists and is available
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.body.product_variant_id,
        active: true,
        deleted_at: null,
      },
    });

  if (!productVariant) {
    throw new HttpException(
      "Product variant not found or is no longer available",
      404,
    );
  }

  // Check inventory availability
  if (productVariant.stock_quantity < props.body.quantity) {
    throw new HttpException(
      `Only ${productVariant.stock_quantity} units available in stock`,
      400,
    );
  }

  // Use product variant price if available, otherwise default to 0
  const unitPrice = productVariant.price ?? 0;

  // Check for existing cart item with same product variant
  const existingCartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
      where: {
        shopping_mall_cart_id: props.cartId,
        shopping_mall_product_variant_id: props.body.product_variant_id,
      },
    });

  const now = toISOStringSafe(new Date());

  let cartItem;
  if (existingCartItem) {
    // Update quantity if item already exists
    const newQuantity = existingCartItem.quantity + props.body.quantity;

    // Check if new quantity exceeds maximum limit
    if (newQuantity > 999) {
      throw new HttpException(
        "Total quantity cannot exceed 999 units per product variant",
        400,
      );
    }

    cartItem = await MyGlobal.prisma.shopping_mall_cart_items.update({
      where: { id: existingCartItem.id },
      data: {
        quantity: newQuantity,
        unit_price: unitPrice,
        updated_at: now,
        notes: props.body.notes ?? existingCartItem.notes,
      },
    });
  } else {
    // Create new cart item
    cartItem = await MyGlobal.prisma.shopping_mall_cart_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_cart_id: props.cartId,
        shopping_mall_product_variant_id: props.body.product_variant_id,
        quantity: props.body.quantity,
        unit_price: unitPrice,
        added_at: now,
        updated_at: now,
        notes: props.body.notes ?? null,
      },
    });
  }

  // Update cart timestamp to reflect activity
  await MyGlobal.prisma.shopping_mall_carts.update({
    where: { id: props.cartId },
    data: { updated_at: now },
  });

  return {
    id: cartItem.id,
    shopping_mall_cart_id: cartItem.shopping_mall_cart_id,
    shopping_mall_product_variant_id: cartItem.shopping_mall_product_variant_id,
    quantity: cartItem.quantity,
    unit_price: cartItem.unit_price,
    added_at: toISOStringSafe(cartItem.added_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    notes: cartItem.notes ?? undefined,
  };
}
