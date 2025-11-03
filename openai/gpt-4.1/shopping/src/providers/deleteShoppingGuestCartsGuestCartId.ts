import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingGuestCartsGuestCartId(props: {
  guestCartId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, delete all cart items associated with the guest cart.
  await MyGlobal.prisma.shopping_guest_cart_items.deleteMany({
    where: { shopping_guest_cart_id: props.guestCartId },
  });
  // Next, delete the guest cart itself (hard delete). If not found, no error.
  await MyGlobal.prisma.shopping_guest_carts.deleteMany({
    where: { id: props.guestCartId },
  });
  // Always succeed (idempotent); do not throw if cart did not exist.
}
