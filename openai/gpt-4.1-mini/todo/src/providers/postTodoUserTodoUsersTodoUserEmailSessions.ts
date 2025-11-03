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

export async function postTodoUserTodoUsersTodoUserEmailSessions(props: {
  user: UserPayload;
  todoUserEmail: string;
  body: ITodoUserSession.ICreate;
}): Promise<ITodoUserSession> {
  const { user, todoUserEmail, body } = props;

  const foundUser = await MyGlobal.prisma.todo_users.findUnique({
    where: { email: todoUserEmail },
  });

  if (foundUser === null) {
    throw new HttpException(`User not found for email: ${todoUserEmail}`, 404);
  }

  if (foundUser.id !== user.id) {
    throw new HttpException(
      `Unauthorized: Cannot create session for another user`,
      403,
    );
  }

  const nowDateTime = toISOStringSafe(new Date());
  const sessionId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: sessionId,
      todo_user_id: foundUser.id,
      ip: body.ip,
      href: body.href,
      referrer: body.referrer,
      created_at: nowDateTime,
      expired_at: null,
    },
  });

  return {
    id: created.id,
    todo_user_id: created.todo_user_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
  };
}
