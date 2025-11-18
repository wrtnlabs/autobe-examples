import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListGuestsTodoListGuestIdTodoListGuestSessionsId(props: {
  user: UserPayload;
  todoListGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: ITodoListGuestSession.IUpdate;
}): Promise<ITodoListGuestSession> {
  const existing = await MyGlobal.prisma.todo_list_guest_sessions.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Guest session not found", 404);
  }

  if (existing.todo_list_guest_id !== props.todoListGuestId) {
    throw new HttpException(
      "Guest session does not belong to the specified guest",
      403,
    );
  }

  const updated = await MyGlobal.prisma.todo_list_guest_sessions.update({
    where: { id: props.id },
    data: {
      ip: props.body.ip ?? undefined,
      href: props.body.href ?? undefined,
      referrer: props.body.referrer ?? undefined,
      created_at: props.body.created_at ?? undefined,
      expired_at:
        props.body.expired_at === undefined ? undefined : props.body.expired_at,
    },
  });

  return {
    id: updated.id,
    todo_list_guest_id: updated.todo_list_guest_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
