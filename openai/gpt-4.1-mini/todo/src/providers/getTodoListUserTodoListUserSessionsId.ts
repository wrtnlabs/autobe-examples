import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodoListUserSessionsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.id },
  });

  if (!session) {
    throw new HttpException("User session not found", 404);
  }

  return {
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at == null ? null : toISOStringSafe(session.expired_at),
    href: session.href,
    ip: session.ip ?? undefined,
    referrer: session.referrer,
    todo_list_user_id: session.todo_list_user_id,
  };
}
