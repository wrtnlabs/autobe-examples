import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoListGuest> {
  const guest = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: {
      id: props.guestId,
    },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  return {
    id: guest.id,
    ip_address: guest.ip_address ?? undefined,
    user_agent: guest.user_agent ?? undefined,
    visited_at: toISOStringSafe(guest.visited_at),
    created_at: toISOStringSafe(guest.created_at),
  };
}
