import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodoListGuestsTodoListGuestIdTodoListGuestSessionsId(props: {
  user: UserPayload;
  todoListGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListGuestSession> {
  const session = await MyGlobal.prisma.todo_list_guest_sessions.findFirst({
    where: {
      id: props.id,
      todo_list_guest_id: props.todoListGuestId,
    },
  });

  if (!session) {
    throw new HttpException("Todo list guest session not found", 404);
  }

  return {
    id: session.id,
    todo_list_guest_id: session.todo_list_guest_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
