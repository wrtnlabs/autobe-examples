import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTaskPriority";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTasksTaskIdPriorities(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoListTaskPriority.IUpdate;
}): Promise<ITodoListTaskPriority> {
  // Verify user has permission to update this task priority
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.taskId },
    select: { todo_list_user_id: true },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized: You can only update priorities for your own tasks",
      403,
    );
  }

  // Verify task priority exists
  const existingPriority =
    await MyGlobal.prisma.todo_list_task_priorities.findUnique({
      where: { todo_list_task_id: props.taskId },
      select: {
        id: true,
        priority_level: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!existingPriority) {
    throw new HttpException("Task priority not found", 404);
  }

  // Validate priority_level
  const validPriorityLevels = ["Low", "Medium", "High"];
  if (!validPriorityLevels.includes(props.body.priority_level)) {
    throw new HttpException(
      "Invalid priority level. Must be one of: Low, Medium, High",
      400,
    );
  }

  // Update task priority
  const updatedPriority =
    await MyGlobal.prisma.todo_list_task_priorities.update({
      where: { todo_list_task_id: props.taskId },
      data: {
        priority_level: props.body.priority_level,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        todo_list_task_id: true,
        priority_level: true,
        created_at: true,
        updated_at: true,
      },
    });

  // Return updated task priority with proper types
  return {
    id: updatedPriority.id,
    todo_list_task_id: updatedPriority.todo_list_task_id,
    priority_level: updatedPriority.priority_level,
    created_at: toISOStringSafe(updatedPriority.created_at),
    updated_at: toISOStringSafe(updatedPriority.updated_at),
  };
}
