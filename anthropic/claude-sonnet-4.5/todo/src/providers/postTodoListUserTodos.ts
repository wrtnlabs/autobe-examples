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

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  if (props.body.todo_list_category_id) {
    const category = await MyGlobal.prisma.todo_list_categories.findFirst({
      where: {
        id: props.body.todo_list_category_id,
        todo_list_user_id: props.user.id,
      },
    });

    if (!category) {
      throw new HttpException(
        "Category not found or does not belong to the user",
        404,
      );
    }
  }

  const now = new Date();
  const todoId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      todo_list_user_id: props.user.id,
      todo_list_category_id: props.body.todo_list_category_id ?? null,
      title: props.body.title,
      description: props.body.description ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      priority: props.body.priority ?? "medium",
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      user: true,
      category: true,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    user: {
      id: created.user.id as string & tags.Format<"uuid">,
      email: created.user.email as string & tags.Format<"email">,
      name: created.user.name ?? undefined,
      created_at: toISOStringSafe(created.user.created_at),
    },
    category: created.category
      ? {
          id: created.category.id as string & tags.Format<"uuid">,
          name: created.category.name,
          created_at: toISOStringSafe(created.category.created_at),
        }
      : undefined,
    title: created.title,
    description: created.description ?? undefined,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    priority: created.priority as "low" | "medium" | "high",
    status: created.status as "pending" | "completed",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
