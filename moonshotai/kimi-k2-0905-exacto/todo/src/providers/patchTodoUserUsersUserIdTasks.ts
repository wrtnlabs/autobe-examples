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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsersUserIdTasks(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoTask.IRequest;
}): Promise<IPageITodoTask.ISummary> {
  const { user, userId, body } = props;

  // Authorization check - ensure user can only access their own tasks
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own tasks",
      403,
    );
  }

  // Calculate pagination
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Build where clause with optional filters
  const where = {
    todo_user_id: userId,
    ...(body.search !== undefined &&
      body.search !== null && {
        description: { contains: body.search },
      }),
    ...(body.completed !== undefined &&
      body.completed !== null && {
        completed: body.completed,
      }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
  };

  // Determine sort order - inline definition for proper type inference
  const orderBy = {
    [body.order_by ?? "updated_at"]: body.direction ?? "desc",
  } satisfies Prisma.todo_tasksOrderByWithRelationInput;

  // Execute queries in parallel
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_tasks.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_tasks.count({ where }),
  ]);

  // Transform results to API format
  const data = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    description: task.description,
    completed: task.completed,
    business_status: task.business_status as
      | "pending"
      | "processing"
      | "completed",
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
  }));

  // Build pagination info - strip Typia tags using Number() constructor
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;

  return {
    pagination,
    data,
  } satisfies IPageITodoTask.ISummary;
}
