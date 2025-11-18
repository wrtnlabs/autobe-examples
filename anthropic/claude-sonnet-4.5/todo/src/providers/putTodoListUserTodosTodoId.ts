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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (existing.deleted_at !== null) {
    throw new HttpException("Todo has been deleted", 410);
  }

  if (props.body.todo_list_category_id !== undefined) {
    if (props.body.todo_list_category_id !== null) {
      const category = await MyGlobal.prisma.todo_list_categories.findFirst({
        where: {
          id: props.body.todo_list_category_id,
          todo_list_user_id: props.user.id,
        },
      });

      if (!category) {
        throw new HttpException(
          "Category not found or does not belong to user",
          404,
        );
      }
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.due_date !== undefined && {
        due_date:
          props.body.due_date !== null ? new Date(props.body.due_date) : null,
      }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.todo_list_category_id !== undefined && {
        todo_list_category_id: props.body.todo_list_category_id,
      }),
      updated_at: new Date(),
    },
    include: {
      user: true,
      category: true,
    },
  });

  return {
    id: updated.id,
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name ?? undefined,
      created_at: toISOStringSafe(updated.user.created_at),
    },
    category: updated.category
      ? {
          id: updated.category.id,
          name: updated.category.name,
          created_at: toISOStringSafe(updated.category.created_at),
        }
      : undefined,
    title: updated.title,
    description: updated.description ?? undefined,
    due_date: updated.due_date ? toISOStringSafe(updated.due_date) : undefined,
    priority: typia.assert<"low" | "medium" | "high">(updated.priority),
    status: typia.assert<"pending" | "completed">(updated.status),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
