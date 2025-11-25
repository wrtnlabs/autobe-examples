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

export async function postTodoAppAdminTodos(props: {
  admin: AdminPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Generate unique UUID for the todo item
  const todoId = v4() as string & tags.Format<"uuid">;

  // Get current timestamp for created_at and updated_at
  const now = new Date();
  const createdAt = toISOStringSafe(now);
  const updatedAt = createdAt;

  // Prepare data for database insertion
  const createData = {
    id: todoId,
    title: props.body.title,
    description: props.body.description,
    status: props.body.status ?? "pending",
    business_status: props.body.business_status ?? "active",
    priority: props.body.priority ?? "medium",
    category: props.body.category,
    due_date: props.body.due_date ? new Date(props.body.due_date) : null,
    todo_app_administrator_id: props.admin.id,
    todo_app_member_id: null, // Administrators don't belong to member table
    created_at: now,
    updated_at: now,
    completed_at: null, // New todos aren't completed yet
    deleted_at: null, // New todos aren't deleted
  };

  // Insert the new todo into database
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: createData,
  });

  // Return formatted todo object matching ITodoAppTodo interface
  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    status: typia.assert<"pending" | "in_progress" | "completed" | "cancelled">(
      created.status,
    ),
    business_status: typia.assert<"active" | "on_hold" | "archived">(
      created.business_status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | "urgent">(
      created.priority,
    ),
    category: created.category ?? undefined,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
