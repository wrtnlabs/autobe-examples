import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminTodoUsersTodoUserIdSessionsSessionId(props: {
  todoAdmin: TodoadminPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodouserSession> {
  // Authorization for todoAdmin is handled by TodoadminAuth at the controller layer.
  // Here we only enforce that the requested session belongs to the specified todo user
  // and expose a read-only administrative view.

  const sessionRecord =
    await MyGlobal.prisma.todo_app_todouser_sessions.findFirst({
      where: {
        id: props.sessionId,
        // Scope lookup to the owning todo user using the foreign key column
        todo_app_todouser_id: props.todoUserId,
      },
    });

  if (sessionRecord === null) {
    // Do not leak cross-user information: when the (user, session) pair
    // does not resolve to a row, respond with not found.
    throw new HttpException("Session not found", 404);
  }

  // Load owning todo user separately to build owner summary.
  const owner = await MyGlobal.prisma.todo_app_todousers.findUnique({
    where: {
      id: sessionRecord.todo_app_todouser_id,
    },
  });

  const ownerSummary: ITodoAppTodoUser.ISummary | undefined =
    owner === null
      ? undefined
      : {
          id: owner.id,
          email: owner.email,
          display_name:
            owner.display_name === null ? undefined : owner.display_name,
          status: owner.status,
          created_at: toISOStringSafe(owner.created_at),
        };

  const expiredAtValue: (string & tags.Format<"date-time">) | null | undefined =
    sessionRecord.expired_at === null
      ? null
      : toISOStringSafe(sessionRecord.expired_at);

  return {
    id: sessionRecord.id,
    ip: sessionRecord.ip,
    href: sessionRecord.href,
    referrer: sessionRecord.referrer,
    created_at: toISOStringSafe(sessionRecord.created_at),
    expired_at: expiredAtValue,
    owner: ownerSummary,
  };
}
