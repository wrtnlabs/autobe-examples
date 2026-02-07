import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  const now = new Date();
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      todo_app_user_id: props.user.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      title: "Untitled Todo",
      description: null,
      start_date: null,
      due_date: null,
      is_completed: false,
    },
  });
  return {
    id: created.id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at,
    title: created.title,
    is_completed: created.is_completed,
  };
}
