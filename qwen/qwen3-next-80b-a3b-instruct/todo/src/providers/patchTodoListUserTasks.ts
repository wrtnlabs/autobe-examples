import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { IPageITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTasks(props: {
  user: UserPayload;
  body: ITodoListTask.IRequest;
}): Promise<IPageITodoListTask.ISummary> {
  // IRequest is defined as string - this is a search term only
  const searchTerm = props.body;

  // Pagination defaults
  const page = 1;
  const limit = 20;

  // Validate pagination bounds (in case they're adjustable later)
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;

  // Construct search condition - filter by user and deletion status
  const whereConditions: Prisma.todo_list_taskWhereInput = {
    user_id: props.user.id,
    deleted_at: null,
  };

  // Apply full-text search if search term provided (IRequest is string)
  if (searchTerm && searchTerm.trim().length > 0) {
    whereConditions.description = { contains: searchTerm.trim() };
  }

  // Default sorting: created_at desc
  const orderBy: Prisma.todo_list_taskOrderByWithRelationInput = {
    created_at: "desc",
  };

  // Fetch data and total count
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_list_task.findMany({
      where: whereConditions,
      skip,
      take: validLimit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_task.count({
      where: whereConditions,
    }),
  ]);

  // Transform to summary format with correct date formats
  const summaryTasks: ITodoListTask.ISummary[] = tasks.map((task) => ({
    id: task.id,
    description: task.description,
    completed: task.completed,
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
    created_at: toISOStringSafe(task.created_at),
  }));

  return {
    pagination: {
      current: validPage,
      limit: validLimit,
      records: total,
      pages: Math.ceil(total / validLimit),
    },
    data: summaryTasks,
  };
}
