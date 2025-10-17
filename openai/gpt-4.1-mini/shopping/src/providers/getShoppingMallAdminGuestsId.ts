import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminGuestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuest> {
  const { id } = props;

  const guest = await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: {
      id,
      deleted_at: null,
    },
    select: {
      id: true,
      session_token: true,
      ip_address: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: guest.id,
    session_token: guest.session_token,
    ip_address: guest.ip_address ?? null,
    user_agent: guest.user_agent ?? null,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
