import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminTodoUsersTodoUserId(props: {
  todoAdmin: TodoadminPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoUser> {
  const todoUser = await MyGlobal.prisma.todo_app_todousers.findUnique({
    where: {
      id: props.todoUserId,
    },
  });

  if (todoUser === null) {
    throw new HttpException("Todo user not found", 404);
  }

  return {
    id: todoUser.id,
    email: todoUser.email,
    display_name: todoUser.display_name === null ? null : todoUser.display_name,
    status: todoUser.status,
    last_login_at:
      todoUser.last_login_at === null
        ? null
        : toISOStringSafe(todoUser.last_login_at),
    created_at: toISOStringSafe(todoUser.created_at),
    updated_at: toISOStringSafe(todoUser.updated_at),
  };
}
