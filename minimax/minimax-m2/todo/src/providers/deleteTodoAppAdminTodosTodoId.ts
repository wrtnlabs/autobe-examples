import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminTodosTodoId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Find the todo item by ID
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existingTodo) {
    throw new HttpException("Todo item not found", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const deletedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Log the deletion in audit logs
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_administrator_id: props.admin.id,
      target_todo_id: props.todoId,
      action_type: "delete_todo",
      action_description: `Administrator deleted todo item: ${deletedTodo.title}`,
      entity_type: "todo",
      entity_id: props.todoId,
      old_values: JSON.stringify({
        id: existingTodo.id,
        title: existingTodo.title,
        status: existingTodo.status,
        business_status: existingTodo.business_status,
        priority: existingTodo.priority,
        category: existingTodo.category,
        due_date: existingTodo.due_date,
        completed_at: existingTodo.completed_at,
      }),
      new_values: JSON.stringify({
        id: deletedTodo.id,
        title: deletedTodo.title,
        status: deletedTodo.status,
        business_status: deletedTodo.business_status,
        priority: deletedTodo.priority,
        category: deletedTodo.category,
        due_date: deletedTodo.due_date,
        completed_at: deletedTodo.completed_at,
        deleted_at: deletedTodo.deleted_at,
      }),
      severity_level: "info",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Return the deleted todo with proper type conversions
  return {
    id: deletedTodo.id,
    title: deletedTodo.title,
    description: deletedTodo.description ?? undefined,
    status: deletedTodo.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "cancelled",
    business_status: deletedTodo.business_status as
      | "active"
      | "on_hold"
      | "archived",
    priority: deletedTodo.priority as "low" | "medium" | "high" | "urgent",
    category: deletedTodo.category ?? undefined,
    due_date: deletedTodo.due_date
      ? toISOStringSafe(deletedTodo.due_date)
      : undefined,
    completed_at: deletedTodo.completed_at
      ? toISOStringSafe(deletedTodo.completed_at)
      : undefined,
    created_at: toISOStringSafe(deletedTodo.created_at),
    updated_at: toISOStringSafe(deletedTodo.updated_at),
    deleted_at: toISOStringSafe(deletedTodo.deleted_at!),
  };
}
