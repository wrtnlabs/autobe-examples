import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";
import { IDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateTimeRange";
import { IPageITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoListAuditLog.IRequest;
}): Promise<IPageITodoListAuditLog.ISummary> {
  const {
    event_time_range,
    event_types,
    admin_id,
    target_user_id,
    search,
    page,
    limit,
    sort_descending,
  } = props.body;

  const skip = ((page ?? 1) - 1) * (limit ?? 20);
  const take = limit ?? 20;
  const orderBy = [
    {
      event_time:
        (sort_descending ?? true)
          ? Prisma.SortOrder.desc
          : Prisma.SortOrder.asc,
    },
  ];

  const filters: any = {
    ...(event_types && event_types.length > 0
      ? { event_type: { in: event_types } }
      : {}),
    ...(admin_id != null ? { admin_id } : {}),
    ...(target_user_id != null ? { target_user_id } : {}),
    ...(event_time_range && event_time_range !== null
      ? {
          event_time: {
            gte: event_time_range.from,
            lte: event_time_range.to,
          },
        }
      : {}),
  };
  if (search && search !== null && search !== undefined) {
    filters.details = { contains: search };
  }

  // fetch paged data and total count concurrently
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.todo_list_audit_logs.findMany({
      where: filters,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_audit_logs.count({
      where: filters,
    }),
  ]);

  const data = logs.map((row) => ({
    id: row.id,
    admin_id: row.admin_id,
    event_type: row.event_type,
    event_time: toISOStringSafe(row.event_time),
    target_user_id:
      row.target_user_id === null ? undefined : row.target_user_id,
    details: row.details === null ? undefined : row.details,
  }));

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data,
  };
}
