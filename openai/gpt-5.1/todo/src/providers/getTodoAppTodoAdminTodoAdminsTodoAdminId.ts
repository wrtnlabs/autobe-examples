import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminTodoAdminsTodoAdminId(props: {
  todoAdmin: TodoadminPayload;
  todoAdminId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoAdmin> {
  const admin = await MyGlobal.prisma.todo_app_todoadmins.findUnique({
    where: {
      id: props.todoAdminId,
    },
  });

  if (admin === null) {
    throw new HttpException("Todo admin account not found", 404);
  }

  const displayName =
    admin.display_name === null ? undefined : admin.display_name;
  const lastLoginAt =
    admin.last_login_at === null
      ? undefined
      : toISOStringSafe(admin.last_login_at);

  return {
    id: admin.id,
    email: admin.email,
    display_name: displayName,
    status: admin.status,
    last_login_at: lastLoginAt,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
  };
}
