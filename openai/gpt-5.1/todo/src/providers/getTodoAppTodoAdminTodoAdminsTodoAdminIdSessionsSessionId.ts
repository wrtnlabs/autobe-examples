import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminTodoAdminsTodoAdminIdSessionsSessionId(props: {
  todoAdmin: TodoadminPayload;
  todoAdminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoAdminSession> {
  // Only the owner admin may inspect their own session details.
  if (props.todoAdmin.id !== props.todoAdminId) {
    throw new HttpException(
      "Forbidden to access sessions of another administrator",
      403,
    );
  }

  const session = await MyGlobal.prisma.todo_app_todoadmin_sessions.findFirst({
    where: {
      id: props.sessionId,
      todoAdmin: {
        id: props.todoAdminId,
      },
    },
    include: {
      todoAdmin: true,
    },
  });

  if (!session) {
    // Do not disclose whether the session or admin exists beyond necessary.
    throw new HttpException("Admin session not found", 404);
  }

  const admin = session.todoAdmin;

  const adminSummary: ITodoAppTodoAdmin.ISummary = {
    id: admin.id,
    email: admin.email,
    // display_name column is nullable in DB, optional in DTO
    display_name: admin.display_name === null ? undefined : admin.display_name,
    status: admin.status,
    last_login_at:
      admin.last_login_at === null
        ? undefined
        : toISOStringSafe(admin.last_login_at),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  };

  const result: ITodoAppTodoAdminSession = {
    id: session.id,
    todoAdmin: adminSummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };

  return result;
}
