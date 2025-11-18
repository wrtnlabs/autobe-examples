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

export async function deleteTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
    include: {
      user: true,
      category: true,
    },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const deleted = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
    include: {
      user: true,
      category: true,
    },
  });

  return {
    id: deleted.id,
    user: {
      id: deleted.user.id,
      email: deleted.user.email,
      name: deleted.user.name === null ? undefined : deleted.user.name,
      created_at: toISOStringSafe(deleted.user.created_at),
    },
    category:
      deleted.category === null
        ? undefined
        : {
            id: deleted.category.id,
            name: deleted.category.name,
            created_at: toISOStringSafe(deleted.category.created_at),
          },
    title: deleted.title,
    description: deleted.description === null ? undefined : deleted.description,
    due_date:
      deleted.due_date === null ? undefined : toISOStringSafe(deleted.due_date),
    priority: typia.assert<"low" | "medium" | "high">(deleted.priority),
    status: typia.assert<"pending" | "completed">(deleted.status),
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at:
      deleted.deleted_at === null
        ? undefined
        : toISOStringSafe(deleted.deleted_at),
  };
}
