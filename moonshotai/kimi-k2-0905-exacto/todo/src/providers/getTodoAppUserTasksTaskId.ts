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
import { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTask> {
  // Fetch task with user and category relationships
  const task = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
    include: {
      user: true,
      category: true,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Authorization check - ensure user owns the task
  if (task.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "You don't have permission to access this task",
      403,
    );
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: typia.assert<"pending" | "in-progress" | "completed">(task.status),
    priority: typia.assert<"Low" | "Medium" | "High">(task.priority),
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    completion_order: task.completion_order,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    user: {
      id: task.user.id,
      email: task.user.email,
      created_at: toISOStringSafe(task.user.created_at),
      updated_at: toISOStringSafe(task.user.updated_at),
      deleted_at: task.user.deleted_at
        ? toISOStringSafe(task.user.deleted_at)
        : undefined,
    },
    category: task.category
      ? {
          id: task.category.id,
          name: task.category.name,
          description: task.category.description,
          created_at: toISOStringSafe(task.category.created_at),
          updated_at: toISOStringSafe(task.category.updated_at),
        }
      : null,
  };
}
