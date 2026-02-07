import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAuditLogs(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on filters
  const whereInput: Prisma.discussion_board_audit_logsWhereInput = {
    created_at: {
      gte: new Date(props.body.start_date),
      lte: new Date(props.body.end_date),
    },
  };
  if (props.body.actor_type !== null && props.body.actor_type !== undefined) {
    whereInput.actor_type = props.body.actor_type;
  }
  if (props.body.action_type !== null && props.body.action_type !== undefined) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.success !== null && props.body.success !== undefined) {
    whereInput.success = props.body.success;
  }
  // For analytics aggregation, we need to use raw SQL with GROUP BY
  // This is complex aggregation that Prisma doesn't support natively
  const timeBucketClause = getTimeBucketSQL(props.body.time_bucket);
  const rawQuery = `
    SELECT 
      ${timeBucketClause} as time_bucket,
      actor_type,
      action_type,
      COUNT(*) as total_count,
      SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failure_count,
      (SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
    FROM discussion_board_audit_logs
    WHERE created_at >= $1 AND created_at <= $2
      ${props.body.actor_type ? "AND actor_type = $3" : ""}
      ${props.body.action_type ? "AND action_type = $4" : ""}
      ${props.body.success !== undefined ? "AND success = $5" : ""}
    GROUP BY time_bucket, actor_type, action_type
    ORDER BY time_bucket DESC
    LIMIT $6 OFFSET $7
  `;
  const params = [
    props.body.start_date,
    props.body.end_date,
    ...(props.body.actor_type ? [props.body.actor_type] : []),
    ...(props.body.action_type ? [props.body.action_type] : []),
    ...(props.body.success !== undefined ? [props.body.success] : []),
    limit,
    skip,
  ];
  const aggregatedData = (await MyGlobal.prisma.$queryRawUnsafe(
    rawQuery,
    ...params,
  )) as Array<{
    time_bucket: string;
    actor_type: string;
    action_type: string;
    total_count: string | number;
    success_count: string | number;
    failure_count: string | number;
    success_rate: string | number;
  }>;
  // Get total count for pagination
  const totalQuery = `
    SELECT COUNT(DISTINCT CONCAT(${timeBucketClause}, actor_type, action_type)) as total
    FROM discussion_board_audit_logs
    WHERE created_at >= $1 AND created_at <= $2
      ${props.body.actor_type ? "AND actor_type = $3" : ""}
      ${props.body.action_type ? "AND action_type = $4" : ""}
      ${props.body.success !== undefined ? "AND success = $5" : ""}
  `;
  const totalResult = (await MyGlobal.prisma.$queryRawUnsafe(
    totalQuery,
    ...params.slice(0, -2),
  )) as Array<{
    total: string | number;
  }>;
  const total = Number(totalResult[0]?.total || 0);
  // Transform aggregated data to match ISummary DTO
  const transformedData = aggregatedData.map((row) => ({
    timeBucket: toISOStringSafe(new Date(row.time_bucket)),
    actorType: row.actor_type as "user" | "admin" | "super_admin" | "system",
    actionType: row.action_type,
    totalCount: Number(row.total_count),
    successCount: Number(row.success_count),
    failureCount: Number(row.failure_count),
    successRate: Number(row.success_rate),
    trendIndicator: undefined, // Complex calculation requiring historical comparison
  }));
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
function getTimeBucketSQL(
  timeBucket?: "hourly" | "daily" | "weekly" | "monthly" | null,
): string {
  switch (timeBucket) {
    case "hourly":
      return "DATE_TRUNC('hour', created_at)";
    case "daily":
      return "DATE_TRUNC('day', created_at)";
    case "weekly":
      return "DATE_TRUNC('week', created_at)";
    case "monthly":
      return "DATE_TRUNC('month', created_at)";
    default:
      return "DATE_TRUNC('hour', created_at)"; // Default to hourly
  }
}
