import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthLog";
import { IPageITodoAppAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuthLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminAuditAuthLogs(props: {
  admin: AdminPayload;
  body: ITodoAppAuthLog.IRequest;
}): Promise<IPageITodoAppAuthLog> {
  // Extract pagination parameters from IPage.IPagination (inherited by ITodoAppAuthLog.IRequest)
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions based on provided filters - only fields allowed by Prisma schema
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  // Filter by actor_id if provided (field exists in todo_app_auth_logs as non-nullable uuid)
  if ((props.body as any).actor_id !== undefined) {
    whereCondition.actor_id = (props.body as any).actor_id;
  }

  // Filter by success status if provided (boolean field)
  if ((props.body as any).success !== undefined) {
    whereCondition.success = (props.body as any).success;
  }

  // Filter by date range - created_at is datetime field (string & Format<'date-time'>)
  const dateConditions: Record<string, unknown> = {};
  if ((props.body as any).created_at_from) {
    dateConditions.gte = (props.body as any).created_at_from;
  }
  if ((props.body as any).created_at_to) {
    dateConditions.lte = (props.body as any).created_at_to;
  }

  if (Object.keys(dateConditions).length > 0) {
    whereCondition.created_at = dateConditions;
  }

  // Execute database query with optimized index usage (actor_id, created_at indexed)
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.todo_app_auth_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_auth_logs.count({ where: whereCondition }),
  ]);

  // Transform database results to match IPageITodoAppAuthLog interface
  // Since ITodoAppAuthLog is defined as string and the Prisma model only has: actor_id, actor_type, success, created_at, updated_at, deleted_at
  // We remove ip and referrer (which are NOT in the Prisma model) as per the explicit DTO documentation
  const items: ITodoAppAuthLog[] = logs.map((log) =>
    JSON.stringify({
      actor_id: log.actor_id,
      actor_type: log.actor_type,
      success: log.success,
      created_at: toISOStringSafe(log.created_at),
      updated_at: toISOStringSafe(log.updated_at),
      deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : null,
    }),
  );

  // Return paginated response matching IPageITodoAppAuthLog
  return {
    items,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
