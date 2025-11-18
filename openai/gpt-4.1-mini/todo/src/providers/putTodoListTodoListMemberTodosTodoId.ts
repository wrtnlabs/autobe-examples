import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function putTodoListTodoListMemberTodosTodoId(props: {
  todoListMember: TodolistmemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // 1. Find the todo and check ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_todolistmember_id: props.todoListMember.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // 2. If updating the title, enforce uniqueness per-user
  if (props.body.title !== undefined && props.body.title !== todo.title) {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        title: props.body.title,
        todo_list_todolistmember_id: props.todoListMember.id,
        id: { not: props.todoId },
      },
    });
    if (duplicate) {
      throw new HttpException("Todo title must be unique per user", 409);
    }
  }

  // 3. Determine completed status/field
  let completed_at: (string & tags.Format<"date-time">) | null | undefined =
    todo.completed_at ? toISOStringSafe(todo.completed_at) : null;
  if (props.body.is_complete !== undefined) {
    if (props.body.is_complete && !todo.is_complete) {
      completed_at = toISOStringSafe(new Date());
    } else if (!props.body.is_complete) {
      completed_at = null;
    }
  }

  // 4. Update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: props.todoId,
      todo_list_todolistmember_id: props.todoListMember.id,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.is_complete !== undefined && {
        is_complete: props.body.is_complete,
      }),
      completed_at,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    is_complete: updated.is_complete,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
