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

export async function patchTodoAppAdminAuditLogs(props: {
  admin: AdminPayload;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog.ISummary> {
  // Set default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause from filters
  const whereCondition: Record<string, unknown> = {};

  // Filter by action_type if provided
  if (props.body.action_type !== undefined && props.body.action_type !== null) {
    whereCondition.action_type = props.body.action_type;
  }

  // Filter by resource_type if provided
  if (
    props.body.resource_type !== undefined &&
    props.body.resource_type !== null
  ) {
    whereCondition.resource_type = props.body.resource_type;
  }

  // Filter by actor_type if provided
  if (props.body.actor_type !== undefined && props.body.actor_type !== null) {
    whereCondition.actor_type = props.body.actor_type;
  }

  // Filter by user_id if provided
  if (props.body.user_id !== undefined && props.body.user_id !== null) {
    whereCondition.user_id = props.body.user_id;
  }

  // Filter by status if provided
  if (props.body.status !== undefined && props.body.status !== null) {
    whereCondition.status = props.body.status;
  }

  // Build date range filter if dates are provided
  const dateRange: Record<string, Date> = {};
  if (props.body.start_date !== undefined && props.body.start_date !== null) {
    dateRange.gte = new Date(props.body.start_date);
  }
  if (props.body.end_date !== undefined && props.body.end_date !== null) {
    dateRange.lte = new Date(props.body.end_date);
  }
  if (Object.keys(dateRange).length > 0) {
    whereCondition.created_at = dateRange;
  }

  // Determine sort field and order
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
  const orderBy: Record<string, "asc" | "desc"> = {
    [sortBy]: sortOrder,
  };

  // Execute concurrent queries for data and total count
  const [auditLogs, totalRecords] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_log.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_audit_log.count({
      where: whereCondition,
    }),
  ]);

  // Calculate pagination info
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  // Map audit logs to ISummary format
  const summaryData: ITodoAppAuditLog.ISummary[] = auditLogs.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    action_type: log.action_type,
    resource_type: log.resource_type,
    actor_type: log.actor_type,
    status: log.status,
    created_at: toISOStringSafe(log.created_at) as string &
      tags.Format<"date-time">,
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    },
    data: summaryData,
  };
}
