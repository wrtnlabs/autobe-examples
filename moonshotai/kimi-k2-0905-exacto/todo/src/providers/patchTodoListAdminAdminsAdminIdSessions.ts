import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdminSession.IRequest;
}): Promise<IPageITodoListAdminSession.ISummary> {
  const {
    created_from,
    created_to,
    expired_from,
    expired_to,
    expired,
    sort,
    order,
    page,
    limit,
  } = props.body;

  // Pagination defaults
  const pageNum = page ?? 1;
  const pageSize = limit ?? 100;
  const skip = (pageNum - 1) * pageSize;

  // Filtering logic
  const where: Record<string, any> = {
    todo_list_admin_id: props.adminId,
    ...(created_from && {
      created_at: {
        ...(created_from && { gte: created_from }),
        ...(created_to && { lte: created_to }),
      },
    }),
    ...(!created_from &&
      created_to && {
        created_at: { lte: created_to },
      }),
    ...((expired_from || expired_to) && {
      expired_at: {
        ...(expired_from && { gte: expired_from }),
        ...(expired_to && { lte: expired_to }),
      },
    }),
    ...(expired === true && { NOT: { expired_at: null } }),
    ...(expired === false && { expired_at: null }),
  };

  // Sort
  const sortField = sort ?? "created_at";
  const sortOrder = order ?? "desc";

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_admin_sessions.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.todo_list_admin_sessions.count({ where }),
  ]);
  return {
    pagination: {
      current: pageNum,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: sessions.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        typeof session.expired_at === "undefined" || session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    })),
  };
}
