import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Create the todo item with user association
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      text: props.body.text,
      completed: props.body.completed ?? false,
      todo_app_user_id: props.user.id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  // Return the created todo with proper date formatting
  return {
    id: created.id,
    text: created.text,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
