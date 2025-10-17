import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function putShoppingMallGuestsId(props: {
  id: string & tags.Format<"uuid">;
  body: IShoppingMallGuest.IUpdate;
}): Promise<IShoppingMallGuest> {
  const updated = await MyGlobal.prisma.shopping_mall_guests.update({
    where: { id: props.id },
    data: {
      session_token: props.body.session_token,
      ip_address: props.body.ip_address ?? undefined,
      user_agent: props.body.user_agent ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    session_token: updated.session_token,
    ip_address: updated.ip_address ?? null,
    user_agent: updated.user_agent ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
