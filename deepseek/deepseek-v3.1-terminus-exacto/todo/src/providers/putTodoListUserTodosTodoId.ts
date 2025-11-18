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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Check if any update data is provided
  if (Object.keys(props.body).length === 0) {
    throw new HttpException("No update data provided", 400);
  }

  // Verify todo exists and belongs to user
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!existingTodo) {
    throw new HttpException(
      "Todo not found or you don't have permission to access it",
      404,
    );
  }

  // Build update data with proper typing
  const updateData: {
    title?: string;
    description?: string | null;
    status?: "pending" | "completed";
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Add only the fields that are provided
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description ?? null;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Update the todo
  const updatedTodo = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Convert to API response format
  return {
    title: updatedTodo.title,
    description:
      updatedTodo.description === null ? undefined : updatedTodo.description,
    status: updatedTodo.status as "pending" | "completed",
  };
}
