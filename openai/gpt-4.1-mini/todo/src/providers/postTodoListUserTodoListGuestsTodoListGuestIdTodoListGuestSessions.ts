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

export async function postTodoListUserTodoListGuestsTodoListGuestIdTodoListGuestSessions(props: {
  user: UserPayload;
  todoListGuestId: string & tags.Format<"uuid">;
  body: ITodoListGuestSession.ICreate;
}): Promise<ITodoListGuestSession> {
  const guest = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.todoListGuestId },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  const created = await MyGlobal.prisma.todo_list_guest_sessions.create({
    data: {
      id: v4(),
      todo_list_guest_id: props.todoListGuestId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: props.body.created_at,
      expired_at: props.body.expired_at ?? null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    todo_list_guest_id: created.todo_list_guest_id as string &
      tags.Format<"uuid">,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
