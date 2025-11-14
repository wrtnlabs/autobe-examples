import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoAppTodo;
}): Promise<ITodoAppTodo> {
  // Find the todo item with matching id and user_id
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });

  // Return 404 if todo doesn't exist or doesn't belong to user
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }

  // Check editability window (10 minutes from creation)
  // Use string comparison since both are ISO strings: https://stackoverflow.com/questions/17521693
  // ISO time strings are comparable as strings: "2025-11-14T02:00:00Z" < "2025-11-14T02:10:00Z"
  const tenMinutesAfterCreation = new Date(
    new Date(todo.created_at).getTime() + 10 * 60 * 1000,
  ).toISOString();

  // Get current time in ISO format without using Date object in business logic
  const now = new Date().toISOString();

  // If current time is after 10-minute window, return 403 Forbidden
  if (now > tenMinutesAfterCreation) {
    throw new HttpException("Edit window expired (10 minutes)", 403);
  }

  // Update the todo item with only allowed fields
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      completed: props.body.completed,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated todo item with all fields
  return {
    id: updatedTodo.id,
    user_id: updatedTodo.user_id,
    title: updatedTodo.title,
    completed: updatedTodo.completed,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
  };
}
