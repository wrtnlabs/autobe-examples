import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IUpdate;
}): Promise<ITodoAppTask> {
  // Find the task and verify ownership
  const existingTask = await MyGlobal.prisma.todo_app_tasks.findFirst({
    where: {
      id: props.taskId,
      todo_app_user_id: props.user.id, // Verify ownership
      deleted_at: null, // Only non-deleted tasks
    },
  });

  if (!existingTask) {
    throw new HttpException("Task not found or not owned by user", 404);
  }

  // Prepare update data with proper typing
  const updateData: Prisma.todo_app_tasksUpdateInput = {
    updated_at: new Date(),
  };

  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }

  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;

    // Handle completion status change
    if (props.body.status === "complete") {
      updateData.completed_at = new Date();
    } else if (props.body.status === "pending") {
      updateData.completed_at = null;
    }
  }

  // Update the task with user relationship
  const updatedTask = await MyGlobal.prisma.todo_app_tasks.update({
    where: { id: props.taskId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  // Return updated task with proper typing
  return {
    id: updatedTask.id,
    title: updatedTask.title,
    description: updatedTask.description || undefined,
    status: updatedTask.status,
    user: {
      id: updatedTask.user.id,
      email: updatedTask.user.email,
    },
    completed_at: updatedTask.completed_at
      ? toISOStringSafe(updatedTask.completed_at)
      : undefined,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  };
}
