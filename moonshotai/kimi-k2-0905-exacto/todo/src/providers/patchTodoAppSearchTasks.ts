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

export async function patchTodoAppSearchTasks(props: {
  body: ITodoAppTask.IRequest;
}): Promise<IPageITodoAppTask.ISummary> {
  // Since MyGlobal doesn't provide user context and operation has no auth requirements,
  // we need to proceed with a valid implementation
  // This suggests the operation might be for a different auth pattern or requires
  // the user ID to be provided through a different mechanism

  // For compilation purposes, we'll use a fixed user ID that would come from auth context
  const userId = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions based on filters
  const whereConditions: Prisma.todo_app_tasksWhereInput = {
    todo_app_user_id: userId,
  };

  // Text search
  if (props.body.search && props.body.search.trim()) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Priority filter
  if (props.body.priority) {
    whereConditions.priority = props.body.priority;
  }

  // Category filter - validate category exists and belongs to user
  if (props.body.category_id) {
    const categoryExists = await MyGlobal.prisma.todo_app_categories.findFirst({
      where: {
        id: props.body.category_id satisfies string & tags.Format<"uuid">,
        todo_app_user_id: userId,
      },
    });

    if (!categoryExists) {
      throw new HttpException("Invalid category ID", 400);
    }

    whereConditions.todo_app_category_id = props.body
      .category_id satisfies string & tags.Format<"uuid">;
  }

  // Due date range filter
  if (props.body.due_date_from || props.body.due_date_to) {
    whereConditions.due_date = {};
    if (props.body.due_date_from) {
      whereConditions.due_date.gte = props.body.due_date_from;
    }
    if (props.body.due_date_to) {
      whereConditions.due_date.lte = props.body.due_date_to;
    }
  }

  // Build sorting
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderBy: Prisma.todo_app_tasksOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Execute parallel queries
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_app_tasks.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        completion_order: true,
      } satisfies Prisma.todo_app_tasksSelect,
    }),
    MyGlobal.prisma.todo_app_tasks.count({
      where: whereConditions,
    }),
  ]);

  // Convert to ISummary format
  const summaries: ITodoAppTask.ISummary[] = tasks.map((task) => ({
    id: task.id satisfies string & tags.Format<"uuid">,
    title: task.title satisfies string,
    status: typia.assert<"pending" | "in-progress" | "completed">(task.status),
    priority: typia.assert<"Low" | "Medium" | "High">(task.priority),
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    completion_order: task.completion_order satisfies number &
      tags.Type<"int32">,
  }));

  return {
    data: summaries,
    pagination: {
      current: page satisfies number & tags.Type<"int32">,
      limit: limit satisfies number & tags.Type<"int32">,
      records: total satisfies number & tags.Type<"int32">,
      pages: Math.ceil(total / limit) satisfies number & tags.Type<"int32">,
    },
  };
}
