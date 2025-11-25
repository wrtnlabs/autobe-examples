import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function getShoppingMallShoppingMallGuestsShoppingMallGuestId(props: {
  shoppingMallGuestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuest> {
  const guest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: props.shoppingMallGuestId },
  });

  if (!guest) {
    throw new HttpException("Shopping mall guest not found", 404);
  }

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
  };
}
