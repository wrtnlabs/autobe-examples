import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAuditAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog> {
  // Parse the string body into URLSearchParams
  const params = new URLSearchParams(props.body);

  // Initialize where condition
  const where: Record<string, any> = {};

  // Map query parameters to actual database field names
  const paramToFieldMap: Record<string, string> = {
    adminId: "admin_id",
    userId: "user_id",
    todoId: "todo_id",
    entityType: "action",
    action: "action",
  };

  for (const [key, value] of params.entries()) {
    const field = paramToFieldMap[key];
    if (field) {
      where[field] = value;
    }
  }

  // Handle date range filtering (start_date, end_date) for created_at
  const startDate = params.get("start_date");
  const endDate = params.get("end_date");
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) {
      where.created_at.gte = startDate;
    }
    if (endDate) {
      where.created_at.lte = endDate;
    }
  }

  // Parse pagination parameters from query with defaults
  const page = params.get("page") ? parseInt(params.get("page")!, 10) : 1;
  const perPage = params.get("per_page")
    ? parseInt(params.get("per_page")!, 10)
    : 10;

  // Ensure minimum pagination values for safety
  const limit = Math.max(1, Math.min(perPage, 100)); // Limit max to 100
  const skip = (page - 1) * limit;

  // Execute the query with pagination
  const [logs, count] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: where,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({ where: where }),
  ]);

  // Transform logs to output format - convert Date to string using toISOStringSafe
  return {
    items: logs.map((log) => ({
      id: log.id,
      adminId: log.admin_id,
      userId: log.user_id !== null ? log.user_id : undefined,
      todoId: log.todo_id !== null ? log.todo_id : undefined,
      actionType: log.action,
      entityType: log.action,
      oldData: log.details ?? undefined,
      newData: log.details ?? undefined,
      ipAddress: log.ip,
      createdAt: toISOStringSafe(log.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: count,
      pages: Math.ceil(count / limit),
    },
  };
}
