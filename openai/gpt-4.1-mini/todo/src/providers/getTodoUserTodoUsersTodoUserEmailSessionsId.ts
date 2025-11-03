import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodoUsersTodoUserEmailSessionsId(props: {
  user: UserPayload;
  todoUserEmail: string;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoUserSession> {
  const { user, todoUserEmail, id } = props;

  const userRecord = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: todoUserEmail },
  });

  if (userRecord === null) {
    throw new HttpException("User not found", 404);
  }

  if (userRecord.id !== user.id) {
    throw new HttpException("Forbidden: Access denied", 403);
  }

  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id,
      todo_user_id: userRecord.id,
    },
  });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    todo_user_id: session.todo_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
