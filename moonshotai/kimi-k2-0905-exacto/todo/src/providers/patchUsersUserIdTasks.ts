import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import { IPageITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchUsersUserIdTasks(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoTask.IRequest;
}): Promise<IPageITodoTask.ISummary> {
  const { userId, body } = props;

  // Extract pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with user ownership
  const where: Record<string, unknown> = {
    todo_user_id: userId,
  };

  // Add search filter if provided - trust parameter already validated
  if (body.search !== undefined && body.search !== null) {
    where.description = {
      contains: body.search,
    };
  }

  // Add completion status filter - check both undefined and null for required field
  if (body.completed !== undefined && body.completed !== null) {
    where.completed = body.completed;
  }

  // Add business status filter - check both undefined and null for required field
  if (body.business_status !== undefined && body.business_status !== null) {
    where.business_status = body.business_status;
  }

  // Set up orderBy
  const orderBy = {
    [body.order_by ?? "updated_at"]: body.direction ?? "desc",
  } as const;

  // Execute paginated query
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_tasks.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        description: true,
        completed: true,
        business_status: true,
        completed_at: true,
      },
    }),
    MyGlobal.prisma.todo_tasks.count({ where }),
  ]);

  // Convert to summary format with proper date handling
  const summaries: ITodoTask.ISummary[] = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    description: task.description,
    completed: task.completed,
    business_status: task.business_status as
      | "pending"
      | "processing"
      | "completed",
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
  }));

  // Build pagination info
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: summaries,
  };
}
