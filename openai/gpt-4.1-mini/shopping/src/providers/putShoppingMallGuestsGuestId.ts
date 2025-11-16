import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function putShoppingMallGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuest.IUpdate;
}): Promise<IShoppingMallGuest> {
  const existing = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: props.guestId },
  });

  if (!existing) {
    throw new HttpException("Guest user not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_guests.update({
    where: { id: props.guestId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
