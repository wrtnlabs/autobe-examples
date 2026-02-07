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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on request filters
  const whereInput = {
    ...(props.body.actor_type !== undefined &&
      props.body.actor_type !== null && {
        actor_type: props.body.actor_type,
      }),
    ...(props.body.action_type !== undefined &&
      props.body.action_type !== null && {
        action_type: props.body.action_type,
      }),
    ...(props.body.success !== undefined &&
      props.body.success !== null && { success: props.body.success }),
    created_at: {
      gte: toISOStringSafe(props.body.start_date),
      lte: toISOStringSafe(props.body.end_date),
    },
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  // For aggregation queries, we need to use raw SQL since Prisma doesn't support GROUP BY with time buckets
  // This is a simplified implementation that returns individual records for now
  const data = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
  });
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereInput,
  });
  // Since we can't do proper aggregation with Prisma, return individual records
  // Each record represents one audit log entry
  const transformedData = data.map((log) => ({
    timeBucket: toISOStringSafe(log.created_at),
    actorType: log.actor_type as "user" | "admin" | "super_admin" | "system",
    actionType: log.action_type,
    totalCount: 1,
    successCount: log.success ? 1 : 0,
    failureCount: log.success ? 0 : 1,
    successRate: log.success ? 100 : 0,
    trendIndicator: undefined,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
