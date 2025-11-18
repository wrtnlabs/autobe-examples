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

export async function postTodoAppUserTasks(props: {
  user: UserPayload;
  body: ITodoAppTask.ICreate;
}): Promise<ITodoAppTask> {
  // Validate user exists and is active
  const userData = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
  });

  if (!userData || userData.deleted_at !== null) {
    throw new HttpException("User not found or inactive", 404);
  }

  // Validate category if provided
  if (props.body.todo_app_category_id) {
    const category = await MyGlobal.prisma.todo_app_categories.findUnique({
      where: {
        id: props.body.todo_app_category_id,
        todo_app_user_id: props.user.id,
      },
    });

    if (!category) {
      throw new HttpException(
        "Category not found or does not belong to user",
        404,
      );
    }
  }

  // Validate due date if provided (must be future and within 1 year)
  if (props.body.due_date) {
    const dueDate = new Date(props.body.due_date);
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    if (dueDate <= now) {
      throw new HttpException("Due date must be in the future", 400);
    }
    if (dueDate > oneYearFromNow) {
      throw new HttpException(
        "Due date cannot be more than 1 year in advance",
        400,
      );
    }
  }

  // Create the task
  const task = await MyGlobal.prisma.todo_app_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: props.user.id,
      todo_app_category_id: props.body.todo_app_category_id ?? null,
      title: props.body.title,
      description: props.body.description ?? null,
      status: "pending",
      priority: props.body.priority ?? "Low",
      due_date: props.body.due_date ?? null,
      completion_order:
        props.body.completion_order ?? Math.floor(new Date().getTime() / 1000),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Build return object with proper data
  let categorySummary: ITodoAppCategory.ISummary | null = null;
  if (task.todo_app_category_id) {
    const category = await MyGlobal.prisma.todo_app_categories.findUnique({
      where: { id: task.todo_app_category_id },
    });
    if (category) {
      categorySummary = {
        id: category.id,
        name: category.name,
        description: category.description ?? null,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      };
    }
  }

  return {
    id: task.id,
    user: {
      id: userData.id,
      email: userData.email,
      created_at: toISOStringSafe(userData.created_at),
      updated_at: toISOStringSafe(userData.updated_at),
      deleted_at: userData.deleted_at
        ? toISOStringSafe(userData.deleted_at)
        : null,
    },
    category: categorySummary,
    title: task.title,
    description: task.description,
    status: task.status as "pending" | "in-progress" | "completed",
    priority: task.priority as "Low" | "Medium" | "High",
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    completion_order: task.completion_order,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
  };
}
