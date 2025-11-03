import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

export async function postTodoGuests(props: {
  body: ITodoGuest.ICreate;
}): Promise<ITodoGuest> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;

  const guest = await MyGlobal.prisma.todo_guests.create({
    data: {
      id: guestId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.todo_guest_sessions.create({
    data: {
      id: sessionId,
      todo_guest_id: guest.id,
      ip: body.ip ?? "anonymous",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
  };
}
