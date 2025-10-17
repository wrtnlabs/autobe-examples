import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function postShoppingMallGuests(props: {
  body: IShoppingMallGuest.ICreate;
}): Promise<IShoppingMallGuest> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: v4(),
      session_token: props.body.session_token,
      ip_address: props.body.ip_address ?? null,
      user_agent: props.body.user_agent ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    session_token: created.session_token,
    ip_address: created.ip_address ?? null,
    user_agent: created.user_agent ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
