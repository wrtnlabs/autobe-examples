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
  const { user, todoId } = props;

  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own todos",
      403,
    );
  }

  return {
    id: todo.id as string & tags.Format<"uuid">,
    todo_list_user_id: todo.todo_list_user_id as string & tags.Format<"uuid">,
    title: todo.title,
    description: todo.description ?? undefined,
    status: todo.status as "complete" | "incomplete",
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  };
}
