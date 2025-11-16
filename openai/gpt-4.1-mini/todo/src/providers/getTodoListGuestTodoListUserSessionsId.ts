import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function getTodoListGuestTodoListUserSessionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const record = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.id },
  });
  if (!record) throw new HttpException("User session not found", 404);

  return {
    id: record.id,
    created_at: toISOStringSafe(record.created_at),
    expired_at: record.expired_at ? toISOStringSafe(record.expired_at) : null,
    href: record.href,
    ip: record.ip === null ? undefined : record.ip,
    referrer: record.referrer,
    todo_list_user_id: record.todo_list_user_id,
  };
}
