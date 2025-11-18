import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminTodoListAdminsTodoListAdminIdTodoListAdminSessionsId(props: {
  admin: AdminPayload;
  todoListAdminId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminSession> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: {
      id: props.id,
    },
  });

  if (
    session === null ||
    session.todo_list_admin_id !== props.todoListAdminId
  ) {
    throw new HttpException("Admin session not found", 404);
  }

  return {
    id: session.id,
    todoListAdminId: session.todo_list_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
