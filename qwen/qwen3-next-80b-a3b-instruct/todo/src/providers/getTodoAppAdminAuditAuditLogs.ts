import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuditAuditLogs(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppAuditLog> {
  const page = 1;
  const limit = 100;

  const [auditLogs, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      orderBy: {
        created_at: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_audit_logs.count(),
  ]);

  return {
    items: auditLogs.map((log) => ({
      id: log.id,
      adminId: log.admin_id,
      userId: log.user_id satisfies string | null as string | undefined,
      todoId: log.todo_id satisfies string | null as string | undefined,
      actionType: log.action,
      entityType: log.details satisfies string | null as string | undefined,
      ipAddress: log.ip,
      createdAt: toISOStringSafe(log.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
