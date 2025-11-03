import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function postShoppingGuestCartsGuestCartIdItems(props: {
  guestCartId: string;
  body: IShoppingGuestCartItem.ICreate;
}): Promise<IShoppingGuestCartItem> {
  const now = toISOStringSafe(new Date());

  // 1. Find guest cart
  const guestCart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });
  if (!guestCart) {
    throw new HttpException("Guest cart not found", 404);
  }

  // 2. Validate SKU exists and is active
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { id: props.body.shopping_sku_id },
    select: { id: true, is_active: true },
  });
  if (!sku || !sku.is_active) {
    throw new HttpException("SKU not available or inactive", 400);
  }

  // 3. Check if item is already in cart
  const existingItem =
    await MyGlobal.prisma.shopping_guest_cart_items.findUnique({
      where: {
        shopping_guest_cart_id_shopping_sku_id: {
          shopping_guest_cart_id: props.guestCartId,
          shopping_sku_id: props.body.shopping_sku_id,
        },
      },
    });

  if (existingItem) {
    // Update quantity
    await MyGlobal.prisma.shopping_guest_cart_items.update({
      where: {
        shopping_guest_cart_id_shopping_sku_id: {
          shopping_guest_cart_id: props.guestCartId,
          shopping_sku_id: props.body.shopping_sku_id,
        },
      },
      data: {
        quantity: existingItem.quantity + props.body.quantity,
        updated_at: now,
      },
    });
  } else {
    // Create new item
    await MyGlobal.prisma.shopping_guest_cart_items.create({
      data: {
        id: v4(),
        shopping_guest_cart_id: props.guestCartId,
        shopping_sku_id: props.body.shopping_sku_id,
        quantity: props.body.quantity,
        added_at: now,
        updated_at: now,
      },
    });
  }

  // 4. Update cart updated_at
  await MyGlobal.prisma.shopping_guest_carts.update({
    where: { id: props.guestCartId },
    data: { updated_at: now },
  });

  // 5. Fetch updated cart and items
  const cart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });
  if (!cart) {
    throw new HttpException("Guest cart missing after update", 500);
  }

  const items = await MyGlobal.prisma.shopping_guest_cart_items.findMany({
    where: { shopping_guest_cart_id: props.guestCartId },
  });

  return {
    id: cart.id,
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: items.map((item) => ({
      session_key: cart.session_key,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      expires_at: toISOStringSafe(cart.expires_at),
      items: [], // Item detail would be provided by higher-level DTO in actual application
    })),
  };
}
