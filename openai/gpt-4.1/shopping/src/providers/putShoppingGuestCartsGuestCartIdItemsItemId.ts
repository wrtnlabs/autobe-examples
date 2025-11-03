import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function putShoppingGuestCartsGuestCartIdItemsItemId(props: {
  guestCartId: string;
  itemId: string;
  body: IShoppingGuestCartItem.IUpdate;
}): Promise<IShoppingGuestCartItem> {
  // Find the guest cart
  const cart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });
  if (!cart) throw new HttpException("Guest cart not found", 404);

  // Find the cart item (by itemId + guest cart id for safety)
  const cartItem = await MyGlobal.prisma.shopping_guest_cart_items.findUnique({
    where: { id: props.itemId },
  });
  if (!cartItem || cartItem.shopping_guest_cart_id !== props.guestCartId) {
    throw new HttpException("Cart item not found in this guest cart", 404);
  }

  // Expecting IUpdate: { items: IUpdate[] }, but per OpenAPI we want to PATCH a single item by id.
  // So, we extract the only update from the body.items[0] which must have a new quantity.
  // The only writable field for shopping_guest_cart_items is quantity.
  const newQuantity =
    Array.isArray(props.body.items) && props.body.items.length > 0
      ? (props.body.items[0] as unknown as number)
      : undefined;
  if (typeof newQuantity !== "number" || !Number.isInteger(newQuantity)) {
    throw new HttpException(
      "Invalid request: missing or invalid quantity.",
      400,
    );
  }
  if (newQuantity <= 0) {
    throw new HttpException("Quantity must be positive", 400);
  }
  const MAX_PER_SKU = 10;
  if (newQuantity > MAX_PER_SKU) {
    throw new HttpException("Quantity exceeds maximum allowed per SKU", 400);
  }

  // Update the item
  await MyGlobal.prisma.shopping_guest_cart_items.update({
    where: { id: props.itemId },
    data: {
      quantity: newQuantity,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Re-fetch all items for full cart response
  const cartItems = await MyGlobal.prisma.shopping_guest_cart_items.findMany({
    where: { shopping_guest_cart_id: props.guestCartId },
    orderBy: { added_at: "asc" },
  });

  // Map each cart item to the ISummary structure expected (with dummy items: [] since ISummary.items is recursive)
  const itemsSummary = cartItems.map((ci) => ({
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: [],
  }));

  return {
    id: cart.id,
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: itemsSummary,
  };
}
