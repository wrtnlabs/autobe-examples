import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import { IPageITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoPriority";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoAppTodosPriorities(props: {
  body: ITodoAppTodoPriority.IRequest;
}): Promise<IPageITodoAppTodoPriority.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build WHERE conditions dynamically
  const whereConditions: Record<string, unknown> = {};

  // Handle search term (search in code OR name)
  if (props.body.search) {
    whereConditions.OR = [
      { code: { contains: props.body.search } },
      { name: { contains: props.body.search } },
    ];
  }

  // Handle active status filter
  if (props.body.is_active !== undefined && props.body.is_active !== null) {
    whereConditions.is_active = props.body.is_active;
  }

  // Build ORDER BY conditions
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderDirection = props.body.order_direction ?? "asc";

  if (props.body.order_by) {
    orderBy[props.body.order_by] = orderDirection;
  } else {
    // Default ordering by weight
    orderBy.weight = orderDirection;
  }

  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_priorities.findMany({
      where:
        Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_todo_priorities.count({
      where:
        Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
    }),
  ]);

  // Convert to API response format
  const paginatedData: ITodoAppTodoPriority.ISummary[] = data.map(
    (priority) => ({
      id: priority.id as string & tags.Format<"uuid">,
      code: priority.code,
      name: priority.name,
      description: priority.description ?? undefined,
      weight: priority.weight as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      is_active: priority.is_active ?? undefined,
      created_at: toISOStringSafe(priority.created_at),
    }),
  );

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: totalPages as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: paginatedData,
  };
}
