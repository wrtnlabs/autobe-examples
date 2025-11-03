import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

export async function patchShoppingGuestCartsGuestCartIdItems(props: {
  guestCartId: string & tags.Format<"uuid">;
}): Promise<IShoppingGuestCartItem.ISummary> {
  const guestCart = await MyGlobal.prisma.shopping_guest_carts.findUnique({
    where: { id: props.guestCartId },
  });

  if (!guestCart) {
    const now = toISOStringSafe(new Date());
    return {
      session_key: "",
      created_at: now,
      updated_at: now,
      expires_at: now,
      items: [],
    };
  }

  const cartItems = await MyGlobal.prisma.shopping_guest_cart_items.findMany({
    where: { shopping_guest_cart_id: props.guestCartId },
    orderBy: { added_at: "asc" },
  });

  const itemsSummaries = cartItems.map(() => ({
    session_key: guestCart.session_key,
    created_at: toISOStringSafe(guestCart.created_at),
    updated_at: toISOStringSafe(guestCart.updated_at),
    expires_at: toISOStringSafe(guestCart.expires_at),
    items: [],
  }));

  return {
    session_key: guestCart.session_key,
    created_at: toISOStringSafe(guestCart.created_at),
    updated_at: toISOStringSafe(guestCart.updated_at),
    expires_at: toISOStringSafe(guestCart.expires_at),
    items: itemsSummaries,
  };
}
