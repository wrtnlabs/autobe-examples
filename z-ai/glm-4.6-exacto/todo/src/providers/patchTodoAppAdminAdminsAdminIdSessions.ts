import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoAppAdminSession.IRequest;
}): Promise<IPageITodoAppAdminSession.ISummary> {
  const {
    page,
    limit,
    search,
    sort_by,
    sort_order,
    ip,
    href,
    referrer,
    created_from,
    created_to,
    expired_from,
    expired_to,
  } = props.body;
  const skip = (page - 1) * limit;
  const orderByField = sort_by ?? "created_at";
  const orderByDirection = sort_order ?? "desc";
  // Build the where clause in an immutable/functional style
  const whereFilter = {
    admin_id: props.adminId,
    ...(ip && { ip }),
    ...(href && { href }),
    ...(referrer && { referrer }),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from && { gte: created_from }),
            ...(created_to && { lte: created_to }),
          },
        }
      : {}),
    ...(expired_from || expired_to
      ? {
          expired_at: {
            ...(expired_from && { gte: expired_from }),
            ...(expired_to && { lte: expired_to }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { ip: { contains: search } },
            { href: { contains: search } },
            { referrer: { contains: search } },
          ],
        }
      : {}),
  };
  const [sessions, count] = await Promise.all([
    MyGlobal.prisma.todo_app_admin_sessions.findMany({
      where: whereFilter,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_admin_sessions.count({
      where: whereFilter,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
    data: sessions.map((s) => ({
      id: s.id,
      admin_id: s.admin_id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
    })),
  };
}
