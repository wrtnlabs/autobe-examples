import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function getShoppingGuestCartsGuestCartId(props: {
  guestCartId: string & tags.Format<"uuid">;
}): Promise<IShoppingGuestCartItem> {
  // Find guest cart by ID
  const cart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });
  // If not found or expired
  const nowInstant = new Date();
  if (!cart || new Date(cart.expires_at) <= nowInstant) {
    throw new HttpException("Guest cart not found or expired", 404);
  }

  // Fetch all line items for this guest cart
  const items = await MyGlobal.prisma.shopping_guest_cart_items.findMany({
    where: { shopping_guest_cart_id: props.guestCartId },
    orderBy: { added_at: "asc" },
  });

  // The DTO's ISummary model is recursive (contains items array again);
  // For actual cart, return a single summary for this cart
  const mappedItems = [
    {
      session_key: cart.session_key,
      created_at: toISOStringSafe(cart.created_at),
      updated_at: toISOStringSafe(cart.updated_at),
      expires_at: toISOStringSafe(cart.expires_at),
      items: [],
    },
  ];

  return {
    id: cart.id,
    session_key: cart.session_key,
    created_at: toISOStringSafe(cart.created_at),
    updated_at: toISOStringSafe(cart.updated_at),
    expires_at: toISOStringSafe(cart.expires_at),
    items: mappedItems,
  };
}
