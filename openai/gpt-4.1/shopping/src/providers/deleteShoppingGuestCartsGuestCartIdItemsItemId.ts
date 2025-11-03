import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingGuestCartsGuestCartIdItemsItemId(props: {
  guestCartId: string;
  itemId: string;
}): Promise<void> {
  // Check if the item exists for the provided guest cart and item IDs
  const cartItem = await MyGlobal.prisma.shopping_guest_cart_items.findFirst({
    where: {
      id: props.itemId,
      shopping_guest_cart_id: props.guestCartId,
    },
  });
  if (!cartItem) {
    throw new HttpException("Cart item not found for this guest cart.", 404);
  }
  await MyGlobal.prisma.shopping_guest_cart_items.delete({
    where: { id: props.itemId },
  });
}
