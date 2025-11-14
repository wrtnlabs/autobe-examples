import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuthLog";
import { ITodoAppAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuditAuthLogs(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppAuthLog> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.todo_app_auth_logs.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        actor_type: true,
        ip: true,
        referrer: true,
        success: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        actor_id: true,
      },
    }),
    MyGlobal.prisma.todo_app_auth_logs.count(),
  ]);

  return {
    items: items.map((log) =>
      JSON.stringify({
        id: log.id,
        actor_type: log.actor_type,
        ip: log.ip,
        referrer: log.referrer,
        success: log.success,
        created_at: toISOStringSafe(log.created_at),
        updated_at: toISOStringSafe(log.updated_at),
        deleted_at: log.deleted_at ?? null,
        actor_id: log.actor_id,
      }),
    ) as string[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
