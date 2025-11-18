import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListCategory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
    },
    include: {
      user: true,
      category: true,
    },
  });

  if (!todo || todo.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only access your own todos",
      403,
    );
  }

  return {
    id: todo.id as string & tags.Format<"uuid">,
    user: {
      id: todo.user.id as string & tags.Format<"uuid">,
      email: todo.user.email as string & tags.Format<"email">,
      name:
        todo.user.name === null
          ? undefined
          : (todo.user.name as string & tags.MaxLength<100>),
      created_at: toISOStringSafe(todo.user.created_at),
    },
    category:
      todo.category === null
        ? undefined
        : {
            id: todo.category.id as string & tags.Format<"uuid">,
            name: todo.category.name,
            created_at: toISOStringSafe(todo.category.created_at),
          },
    title: todo.title as string & tags.MaxLength<200>,
    description:
      todo.description === null
        ? undefined
        : (todo.description as string & tags.MaxLength<2000>),
    due_date:
      todo.due_date === null ? undefined : toISOStringSafe(todo.due_date),
    priority: todo.priority as "low" | "medium" | "high",
    status: todo.status as "pending" | "completed",
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at:
      todo.deleted_at === null ? undefined : toISOStringSafe(todo.deleted_at),
  };
}
