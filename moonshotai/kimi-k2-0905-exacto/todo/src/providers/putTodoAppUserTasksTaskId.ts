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

export async function putTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IUpdate;
}): Promise<ITodoAppTask> {
  // Verify task exists and belongs to user
  const existingTask = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!existingTask) {
    throw new HttpException("Task not found", 404);
  }

  if (existingTask.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this task",
      403,
    );
  }

  // Build update data with proper handling for nullable fields
  const updateData: any = {
    updated_at: new Date(),
  };

  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.todo_app_category_id !== undefined) {
    updateData.todo_app_category_id = props.body.todo_app_category_id;
  }
  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority;
  }
  if (props.body.due_date !== undefined) {
    updateData.due_date = props.body.due_date;
  }
  if (props.body.completion_order !== undefined) {
    updateData.completion_order = props.body.completion_order;
  }

  // Build update data inline with proper type safety
  const updatedTask = await MyGlobal.prisma.todo_app_tasks.update({
    where: { id: props.taskId },
    data: updateData,
  });

  // Load category information if task has a category
  let categoryInfo: ITodoAppCategory.ISummary | null = null;
  if (updatedTask.todo_app_category_id !== null) {
    const category = await MyGlobal.prisma.todo_app_categories.findUnique({
      where: { id: updatedTask.todo_app_category_id },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (category) {
      categoryInfo = {
        id: category.id,
        name: category.name,
        description: category.description,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      };
    }
  }

  // Get user info from database since UserPayload doesn't have email
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Return the updated task
  return {
    id: updatedTask.id,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
    category: categoryInfo,
    title: updatedTask.title,
    description: updatedTask.description,
    status: typia.assert<"pending" | "in-progress" | "completed">(
      updatedTask.status,
    ),
    priority: typia.assert<"Low" | "Medium" | "High">(updatedTask.priority),
    due_date: updatedTask.due_date
      ? toISOStringSafe(updatedTask.due_date)
      : null,
    completion_order: updatedTask.completion_order,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
  };
}
