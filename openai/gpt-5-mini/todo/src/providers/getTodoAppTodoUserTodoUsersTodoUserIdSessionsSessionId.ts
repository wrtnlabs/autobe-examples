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
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTodoUsersTodoUserIdSessionsSessionId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodouserSession> {
  const { todoUser, todoUserId, sessionId } = props;

  // Authorization: ensure the authenticated actor matches the path parameter
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: caller does not match path user",
      403,
    );
  }

  // Retrieve the session and a minimal user summary in a single query
  const session = await MyGlobal.prisma.todo_app_todouser_sessions.findUnique({
    where: { id: sessionId },
    include: {
      todouser: {
        select: {
          id: true,
          display_name: true,
          is_verified: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });

  if (!session) {
    throw new HttpException("Not Found: session does not exist", 404);
  }

  // Ownership check: session must belong to the requested todo user
  if (session.todo_app_todouser_id !== todoUserId) {
    throw new HttpException(
      "Forbidden: session does not belong to the requested user",
      403,
    );
  }

  const user = session.todouser!;

  return {
    id: session.id as string & tags.Format<"uuid">,
    user: {
      id: user.id as string & tags.Format<"uuid">,
      displayName: user.display_name ?? null,
      isVerified: user.is_verified,
      status: user.status ?? undefined,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    },
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer ?? null,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
