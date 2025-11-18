import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRateLimitEvent";
import { IPageITodoAppRateLimitEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppRateLimitEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchTodoAppAdminUserRateLimitEvents(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppRateLimitEvent.IRequest;
}): Promise<IPageITodoAppRateLimitEvent.ISummary> {
  // Authorization: props.adminUser is already validated as an admin via decorator/provider.
  const requestBody = props.body;

  // Pagination: enforce sensible defaults and upper bounds.
  const rawPage = requestBody.page;
  const rawPageSize = requestBody.pageSize;

  const page = rawPage < 1 ? 1 : rawPage;
  const maxPageSize = 200;
  const pageSize =
    rawPageSize < 1
      ? 20
      : rawPageSize > maxPageSize
        ? maxPageSize
        : rawPageSize;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build where conditions based on optional filters.
  const where: Prisma.todo_app_rate_limit_eventsWhereInput = {
    ...(requestBody.actor_type !== undefined && requestBody.actor_type !== null
      ? { actor_type: requestBody.actor_type }
      : {}),
    ...(requestBody.ip !== undefined && requestBody.ip !== null
      ? { ip: requestBody.ip }
      : {}),
    ...(requestBody.limit_key !== undefined && requestBody.limit_key !== null
      ? { limit_key: requestBody.limit_key }
      : {}),
    ...(requestBody.limit_type !== undefined && requestBody.limit_type !== null
      ? { limit_type: requestBody.limit_type }
      : {}),
    ...(() => {
      if (
        requestBody.window_start_from === undefined &&
        requestBody.window_start_to === undefined
      )
        return {};

      if (
        requestBody.window_start_from === null &&
        requestBody.window_start_to === null
      )
        return {};

      const range: Prisma.DateTimeFilter = {};

      if (
        requestBody.window_start_from !== undefined &&
        requestBody.window_start_from !== null
      ) {
        range.gte = requestBody.window_start_from;
      }
      if (
        requestBody.window_start_to !== undefined &&
        requestBody.window_start_to !== null
      ) {
        range.lte = requestBody.window_start_to;
      }

      return Object.keys(range).length === 0 ? {} : { window_start: range };
    })(),
  };

  // Determine sorting field and direction with safe defaults.
  const allowedSortFields: string[] = [
    "created_at",
    "window_start",
    "window_end",
    "limit_key",
    "limit_type",
    "actor_type",
    "ip",
  ];

  const requestedSortBy = requestBody.sort_by;
  const requestedSortOrder = requestBody.sort_order;

  const sortBy =
    requestedSortBy !== undefined &&
    requestedSortBy !== null &&
    allowedSortFields.includes(requestedSortBy)
      ? requestedSortBy
      : "created_at";

  const sortOrder: Prisma.SortOrder =
    requestedSortOrder === "asc" || requestedSortOrder === "desc"
      ? requestedSortOrder
      : "desc";

  const orderBy: Prisma.todo_app_rate_limit_eventsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_rate_limit_events.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.todo_app_rate_limit_events.count({
      where,
    }),
  ]);

  const data = rows.map(
    (row): ITodoAppRateLimitEvent.ISummary => ({
      id: row.id,
      actor_type: row.actor_type,
      ip: row.ip,
      limit_key: row.limit_key,
      limit_type: row.limit_type,
      window_start: toISOStringSafe(row.window_start),
      window_end: toISOStringSafe(row.window_end),
      created_at: toISOStringSafe(row.created_at),
    }),
  );

  const pagination: IPage.IPagination = {
    current: page,
    limit: pageSize,
    records: totalCount,
    pages: pageSize === 0 ? 0 : Math.ceil(totalCount / pageSize),
  };

  return {
    pagination,
    data,
  };
}
