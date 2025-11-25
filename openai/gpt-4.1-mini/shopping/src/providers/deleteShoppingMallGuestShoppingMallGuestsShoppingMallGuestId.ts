import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function deleteShoppingMallGuestShoppingMallGuestsShoppingMallGuestId(props: {
  guest: GuestPayload;
  shoppingMallGuestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingGuest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: props.shoppingMallGuestId },
  });

  if (!existingGuest) {
    throw new HttpException("Guest not found", 404);
  }

  if (existingGuest.id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_guests.delete({
    where: { id: props.shoppingMallGuestId },
  });
}
