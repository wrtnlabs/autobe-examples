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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IUpdate;
}): Promise<ITodoAppTask> {
  // Verify user authorization
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own tasks", 403);
  }

  // Check if task exists and belongs to user
  const existingTask = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: {
      id: props.taskId,
      deleted_at: null, // Only consider non-deleted tasks
    },
  });

  if (!existingTask) {
    throw new HttpException("Task not found", 404);
  }

  if (existingTask.todo_app_user_id !== props.userId) {
    throw new HttpException("Task not found", 404); // Don't reveal it exists but belongs to different user
  }

  // Build update data
  const updateData: Prisma.todo_app_tasksUpdateInput = {
    updated_at: new Date(),
  };

  // Handle optional fields - only update if provided
  if (props.body.title !== undefined) {
    updateData.title = props.body.title ?? undefined;
  }

  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status ?? undefined;

    // Handle completion timestamp
    if (
      props.body.status === "completed" &&
      existingTask.status !== "completed"
    ) {
      updateData.completed_at = new Date();
    } else if (props.body.status === "pending") {
      updateData.completed_at = null; // Reset completion when back to pending
    }
  }

  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }

  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }

  // Update the task
  const updatedTask = await MyGlobal.prisma.todo_app_tasks.update({
    where: { id: props.taskId },
    data: updateData,
    include: {
      user: true, // Include user information for response
    },
  });

  // Get user data for summary
  const userSummary: ITodoAppUser.ISummary = {
    id: updatedTask.user.id,
    email: updatedTask.user.email,
    name: updatedTask.user.name,
    status: updatedTask.user.status,
    created_at: toISOStringSafe(updatedTask.user.created_at),
  };

  // Return the complete task object
  return {
    id: updatedTask.id,
    title: updatedTask.title,
    description: updatedTask.description,
    status: updatedTask.status,
    priority: updatedTask.priority,
    due_date: updatedTask.due_date
      ? toISOStringSafe(updatedTask.due_date)
      : undefined,
    completed_at: updatedTask.completed_at
      ? toISOStringSafe(updatedTask.completed_at)
      : undefined,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    deleted_at: updatedTask.deleted_at
      ? toISOStringSafe(updatedTask.deleted_at)
      : undefined,
    user: userSummary,
  };
}
