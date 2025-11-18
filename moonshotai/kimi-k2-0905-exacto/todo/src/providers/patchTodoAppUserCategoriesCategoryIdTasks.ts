import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserCategoriesCategoryIdTasks(props: {
  user: UserPayload;
  categoryId: string & tags.Format<"uuid">;
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  // Validate that the category exists and belongs to the current user
  const category = await MyGlobal.prisma.todo_app_categories.findUnique({
    where: {
      id: props.categoryId,
      todo_app_user_id: props.user.id,
    },
  });

  if (!category) {
    throw new HttpException("Category not found or access denied", 404);
  }

  // Extract pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions for filtering
  const whereConditions: Prisma.todo_app_tasksWhereInput = {
    todo_app_user_id: props.user.id,
    todo_app_category_id: props.categoryId,
    // Verify body category_id matches path categoryId if both are provided
    ...(props.body.category_id && props.body.category_id !== props.categoryId
      ? { todo_app_category_id: null } // Return empty results if mismatch
      : {}),
  };

  // Add status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Add priority filter
  if (props.body.priority) {
    whereConditions.priority = props.body.priority;
  }

  // Add due date range filter
  if (props.body.due_date_from || props.body.due_date_to) {
    whereConditions.due_date = {};
    if (props.body.due_date_from) {
      whereConditions.due_date.gte = props.body.due_date_from;
    }
    if (props.body.due_date_to) {
      whereConditions.due_date.lte = props.body.due_date_to;
    }
  }

  // Add search filter if provided
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Build order by condition
  const orderBy: Prisma.todo_app_tasksOrderByWithRelationInput = {};
  if (props.body.sort_by) {
    orderBy[props.body.sort_by] = props.body.sort_order ?? "desc";
  } else {
    orderBy.created_at = "desc"; // Default sort by creation date descending
  }

  // Execute queries with pagination
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_app_tasks.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_tasks.count({ where: whereConditions }),
  ]);

  // Map results to response format with proper null/undefined handling
  const data = tasks.map(
    (task): ITodoAppTask.ISummary => ({
      id: task.id as string & tags.Format<"uuid">,
      title: task.title,
      status: task.status as "pending" | "in-progress" | "completed",
      priority: task.priority as "Low" | "Medium" | "High",
      due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
      completion_order: task.completion_order,
    }),
  );

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
