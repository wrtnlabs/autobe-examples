import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function postShoppingMallShoppingMallGuests(props: {
  body: IShoppingMallGuest.ICreate;
}): Promise<IShoppingMallGuest> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: v4(),
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
