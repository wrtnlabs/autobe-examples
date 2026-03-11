import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemMaintenanceLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoSystemMaintenanceLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemMaintenanceLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoSystemMaintenanceLogAtSummaryTransformer } from "../transformers/MultiUserTodoSystemMaintenanceLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAdminSystemMaintenanceLogs(props: {
  admin: AdminPayload;
  body: IMultiUserTodoSystemMaintenanceLog.IRequest;
}): Promise<IPageIMultiUserTodoSystemMaintenanceLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper conditional filtering
  const whereClause: Prisma.multi_user_todo_system_maintenance_logsWhereInput =
    {};
  // Simple string filters
  if (props.body.operation_type !== undefined) {
    whereClause.operation_type = props.body.operation_type;
  }
  if (props.body.status !== undefined) {
    whereClause.status = props.body.status;
  }
  if (props.body.multi_user_todo_admin_id !== undefined) {
    whereClause.multi_user_todo_admin_id = props.body.multi_user_todo_admin_id;
  }
  // Date range filters for started_at
  if (
    props.body.started_at_from !== undefined ||
    props.body.started_at_to !== undefined
  ) {
    whereClause.started_at = {};
    if (props.body.started_at_from !== undefined) {
      whereClause.started_at.gte = new Date(props.body.started_at_from);
    }
    if (props.body.started_at_to !== undefined) {
      whereClause.started_at.lte = new Date(props.body.started_at_to);
    }
  }
  // Date range filters for completed_at (nullable)
  if (
    props.body.completed_at_from !== undefined ||
    props.body.completed_at_to !== undefined
  ) {
    whereClause.completed_at = {};
    if (props.body.completed_at_from !== undefined) {
      whereClause.completed_at.gte = new Date(props.body.completed_at_from);
    }
    if (props.body.completed_at_to !== undefined) {
      whereClause.completed_at.lte = new Date(props.body.completed_at_to);
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_system_maintenance_logs.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...MultiUserTodoSystemMaintenanceLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_system_maintenance_logs.count({
      where: whereClause,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoSystemMaintenanceLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
