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

export async function putTodoUserTodoUsersTodoUserEmailSessionsId(props: {
  user: UserPayload;
  todoUserEmail: string;
  id: string & tags.Format<"uuid">;
  body: ITodoUserSession.IUpdate;
}): Promise<ITodoUserSession> {
  const { user, todoUserEmail, id, body } = props;

  const foundUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: todoUserEmail, deleted_at: null },
  });

  if (!foundUser) {
    throw new HttpException("User not found", 404);
  }

  if (foundUser.id !== user.id) {
    throw new HttpException("Unauthorized to update this session", 403);
  }

  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: { id, todo_user_id: foundUser.id },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  const updated = await MyGlobal.prisma.todo_user_sessions.update({
    where: { id },
    data: {
      ip: body.ip,
      href: body.href,
      referrer: body.referrer,
      expired_at: body.expired_at ?? null,
    },
  });

  return {
    id: updated.id,
    todo_user_id: updated.todo_user_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
