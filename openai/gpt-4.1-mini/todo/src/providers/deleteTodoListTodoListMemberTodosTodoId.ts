import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function deleteTodoListTodoListMemberTodosTodoId(props: {
  todoListMember: TodolistmemberPayload;
  todoId: string;
}): Promise<void> {
  // Find the todo by id and check ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_list_todolistmember_id !== props.todoListMember.id) {
    throw new HttpException("Forbidden: Not your todo", 403);
  }
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoId },
  });
}
