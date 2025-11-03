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

export async function patchTodoUserUserTasks(props: {
  user: UserPayload;
  body: ITodoTask.IRequest;
}): Promise<IPageITodoTask.ISummary> {
  const { user: userPayload, body } = props;

  // Handle pagination parameters with proper type conversion
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Build where clause with user constraint and optional filters
  const where = {
    todo_user_id: userPayload.id,
    ...(body.completed !== undefined &&
      body.completed !== null && {
        completed: body.completed,
      }),
    ...(body.business_status !== undefined &&
      body.business_status !== null && {
        business_status: body.business_status,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        description: {
          contains: body.search,
        },
      }),
  } satisfies Prisma.todo_tasksWhereInput;

  // Determine sort field and direction with default to updated_at desc
  const orderBy = {
    ...((body.order_by === "created_at" || body.order_by === null) && {
      created_at:
        body.direction === "asc" ? ("asc" as const) : ("desc" as const),
    }),
    ...(body.order_by === "updated_at" && {
      updated_at:
        body.direction === "asc" ? ("asc" as const) : ("desc" as const),
    }),
    ...(body.order_by === "completed_at" && {
      completed_at:
        body.direction === "asc" ? ("asc" as const) : ("desc" as const),
    }),
    ...(body.order_by === "description" && {
      description:
        body.direction === "asc" ? ("asc" as const) : ("desc" as const),
    }),
    ...(body.order_by === "business_status" && {
      business_status:
        body.direction === "asc" ? ("asc" as const) : ("desc" as const),
    }),
    ...(!body.order_by && {
      updated_at: "desc" as const,
    }),
  } satisfies Prisma.todo_tasksOrderByWithRelationInput;

  // Execute parallel queries for data and total count
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

  // Transform results to match API response format with proper type handling
  const data: ITodoTask.ISummary[] = tasks.map((task) => ({
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

  // Build pagination metadata with proper formatting
  const pagination = {
    current: page,
    limit: limit,
    records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  } satisfies IPage.IPagination;

  return {
    pagination,
    data,
  } satisfies IPageITodoTask.ISummary;
}
