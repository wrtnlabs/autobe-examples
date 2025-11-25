import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Find the todo ensuring ownership
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }
  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Unique title check if updating title
  if (
    typeof props.body.title === "string" &&
    props.body.title !== existing.title
  ) {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        todo_list_user_id: props.user.id,
        title: props.body.title,
        completed: false,
        NOT: { id: props.todoId },
      },
    });
    if (duplicate) {
      throw new HttpException(
        "A todo with this title already exists among your active todos.",
        409,
      );
    }
  }
  // Prepare update fields (no Date type leaks)
  const updateData: any = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.completed !== undefined) {
    updateData.completed = props.body.completed;
    // Completed logic: set/unset completed_at
    if (props.body.completed && !existing.completed) {
      updateData.completed_at = toISOStringSafe(new Date());
    } else if (!props.body.completed) {
      updateData.completed_at = null;
    }
  }
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    todo_list_user_id: updated.todo_list_user_id,
  };
}
