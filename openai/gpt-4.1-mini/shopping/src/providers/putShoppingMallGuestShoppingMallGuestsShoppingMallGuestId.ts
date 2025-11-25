import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function putShoppingMallGuestShoppingMallGuestsShoppingMallGuestId(props: {
  guest: GuestPayload;
  shoppingMallGuestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuest.IUpdate;
}): Promise<IShoppingMallGuest> {
  const existing = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: props.shoppingMallGuestId },
  });

  if (!existing) {
    throw new HttpException("Guest not found", 404);
  }

  if (existing.id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_guests.update({
    where: { id: props.shoppingMallGuestId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
