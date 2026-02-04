import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppTodoCollector } from "../collectors/TodoAppTodoCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: await TodoAppTodoCollector.collect({
      body: props.body,
      todoAppUsers: { id: props.user.id },
      todoAppUserSessions: { id: props.user.session_id },
    }),
  });
  return {
    id: created.id,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    completion_status: created.completion_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    start_date:
      created.start_date === null
        ? undefined
        : toISOStringSafe(created.start_date),
    due_date:
      created.due_date === null ? undefined : toISOStringSafe(created.due_date),
    is_deleted: created.deleted_at !== null,
  };
}
