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

export async function getTodoListTodoListMemberTodosTodoId(props: {
  todoListMember: TodolistmemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_todolistmember_id: props.todoListMember.id,
    },
  });

  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description === null ? null : todo.description,
    is_complete: todo.is_complete,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
}
