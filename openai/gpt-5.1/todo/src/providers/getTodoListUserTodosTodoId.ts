import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const record = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!record || record.todo_list_user_id !== props.user.id) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: record.id,
    title: record.title,
    description:
      record.description === undefined
        ? undefined
        : record.description === null
          ? null
          : record.description,
    completed: record.completed,
    due_date:
      record.due_date === undefined
        ? undefined
        : record.due_date === null
          ? null
          : toISOStringSafe(record.due_date),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    todo_list_user_id: record.todo_list_user_id,
  };
}
