import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function putTodoAppUserTasksTaskId(props: {
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IUpdate;
}): Promise<ITodoAppTask> {
  // Need to add auth context - this appears to be user-scoped operation
  // Assuming this comes from request context/authentication middleware
  const userId = "user-context-id"; // This should come from auth context

  const existing = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
    include: { user: true },
  });

  if (!existing) {
    throw new HttpException("Task not found", 404);
  }

  // Verify ownership
  if (existing.todo_app_user_id !== userId) {
    throw new HttpException("Forbidden - can only update your own tasks", 403);
  }

  // Build update data with proper types
  const updateData: Prisma.todo_app_tasksUpdateInput = {};

  if (props.body.title !== undefined && props.body.title !== null) {
    updateData.title = props.body.title;
  }

  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  if (props.body.status !== undefined && props.body.status !== null) {
    updateData.status = props.body.status;

    // Handle status transition for completion
    if (props.body.status === "completed" && existing.status !== "completed") {
      updateData.completed_at = new Date();
    } else if (
      props.body.status === "pending" &&
      existing.status === "completed"
    ) {
      updateData.completed_at = null;
    }
  }

  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }

  if (props.body.due_date !== undefined) {
    // Convert string date-time to Date for Prisma if needed
    updateData.due_date =
      props.body.due_date === null
        ? null
        : (new Date(props.body.due_date) as Date | null);
  }

  updateData.updated_at = new Date();

  const updated = await MyGlobal.prisma.todo_app_tasks.update({
    where: { id: props.taskId },
    data: updateData,
    include: { user: true },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    status: updated.status,
    priority: updated.priority === null ? undefined : updated.priority,
    due_date:
      updated.due_date === null ? undefined : toISOStringSafe(updated.due_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    completed_at:
      updated.completed_at === null
        ? undefined
        : toISOStringSafe(updated.completed_at),
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name === null ? undefined : updated.user.name,
      status: updated.user.status,
      created_at: toISOStringSafe(updated.user.created_at),
    },
  };
}
