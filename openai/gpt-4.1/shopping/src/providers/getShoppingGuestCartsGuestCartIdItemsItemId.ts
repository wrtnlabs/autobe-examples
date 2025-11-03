import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function getShoppingGuestCartsGuestCartIdItemsItemId(props: {
  guestCartId: string;
  itemId: string;
}): Promise<IShoppingGuestCartItem> {
  // Fetch the guest cart
  const cart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
    select: {
      id: true,
      session_key: true,
      created_at: true,
      updated_at: true,
      expires_at: true,
    },
  });
  if (!cart) {
    throw new HttpException("Guest cart not found", 404);
  }

  // Check not expired
  if (cart.expires_at < new Date()) {
    throw new HttpException("Guest cart is expired", 404);
  }

  // Fetch the specific guest cart item
  const item = await MyGlobal.prisma.shopping_guest_cart_items.findUnique({
    where: { id: props.itemId },
  });
  if (!item || item.shopping_guest_cart_id !== props.guestCartId) {
    throw new HttpException("Cart item not found in guest cart", 404);
  }

  return {
    id: cart.id as string & tags.Format<"uuid">,
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: [
      {
        session_key: cart.session_key,
        created_at: toISOStringSafe(cart.created_at),
        updated_at: toISOStringSafe(cart.updated_at),
        expires_at: toISOStringSafe(cart.expires_at),
        items: [],
      },
    ],
  };
}
