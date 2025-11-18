import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoListAdminTodosTodoId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Get todo
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo || todo.deleted_at !== null) {
    throw new HttpException("Todo not found or already deleted", 404);
  }

  // Check title uniqueness if changing
  if (typeof props.body.title === "string" && props.body.title !== todo.title) {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        todo_list_user_id: todo.todo_list_user_id,
        deleted_at: null,
        title: props.body.title,
        id: { not: todo.id },
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Todo title must be unique for active todos of the user",
        409,
      );
    }
  }

  let completed_at = todo.completed_at;
  let status = todo.status;
  if (typeof props.body.status === "string") {
    status = props.body.status;
    if (todo.status !== status) {
      if (status === "completed") {
        completed_at = new Date();
      } else {
        completed_at = null;
      }
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.title === "string") updateData.title = props.body.title;
  if ("description" in props.body)
    updateData.description = props.body.description;
  if (typeof status === "string") updateData.status = status;
  updateData.completed_at =
    completed_at !== null ? toISOStringSafe(completed_at) : null;

  // Update todo and log audit in transaction
  const [updatedTodo] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_todos.update({
      where: { id: todo.id },
      data: updateData,
    }),
    MyGlobal.prisma.todo_list_audit_logs.create({
      data: {
        id: v4(),
        admin_id: props.admin.id,
        target_user_id: todo.todo_list_user_id,
        event_type: "todo_updated",
        event_time: toISOStringSafe(new Date()),
        details: `Admin ${props.admin.id} updated todo ${todo.id}. Fields changed: ${Object.keys(props.body).join(", ")}`,
      },
    }),
  ]);

  return {
    id: updatedTodo.id,
    title: updatedTodo.title,
    description:
      typeof updatedTodo.description === "string"
        ? updatedTodo.description
        : (updatedTodo.description ?? null),
    status: typia.assert<"pending" | "completed">(updatedTodo.status),
    completed_at:
      updatedTodo.completed_at !== null &&
      typeof updatedTodo.completed_at !== "undefined"
        ? toISOStringSafe(updatedTodo.completed_at)
        : null,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
    deleted_at:
      updatedTodo.deleted_at !== null &&
      typeof updatedTodo.deleted_at !== "undefined"
        ? toISOStringSafe(updatedTodo.deleted_at)
        : undefined,
  };
}
