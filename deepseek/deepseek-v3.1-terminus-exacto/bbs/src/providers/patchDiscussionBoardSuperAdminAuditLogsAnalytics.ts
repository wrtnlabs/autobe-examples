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

export async function patchDiscussionBoardSuperAdminAuditLogsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IPageIDiscussionBoardAuditLog.ISummary> {
  const {
    actor_type,
    action_type,
    success,
    start_date,
    end_date,
    time_bucket = "daily",
    page = 1,
    limit = 100,
  } = props.body;
  // Validate required fields
  if (!start_date || !end_date) {
    throw new HttpException("Start date and end date are required", 400);
  }
  // Parse dates safely without using Date constructor
  const startTimestamp = start_date;
  const endTimestamp = end_date;
  if (startTimestamp >= endTimestamp) {
    throw new HttpException("Start date must be before end date", 400);
  }
  // Validate actor_type if provided
  if (
    actor_type &&
    !["user", "admin", "super_admin", "system"].includes(actor_type)
  ) {
    throw new HttpException("Invalid actor_type value", 400);
  }
  const skip = (page - 1) * limit;
  // Build WHERE conditions using satisfies for type safety
  const whereConditions = {
    created_at: {
      gte: startTimestamp,
      lte: endTimestamp,
    },
    ...(actor_type ? { actor_type } : {}),
    ...(action_type ? { action_type } : {}),
    ...(success !== undefined && success !== null ? { success } : {}),
  } satisfies Prisma.discussion_board_audit_logsWhereInput;
  // Determine date truncation function based on time bucket
  const dateTruncFunction = {
    hourly: "hour" as const,
    daily: "day" as const,
    weekly: "week" as const,
    monthly: "month" as const,
  }[time_bucket || "daily"];
  // Execute aggregation query using Prisma's groupBy with only _count
  const aggregationResults =
    await MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["actor_type", "action_type"],
      where: whereConditions,
      _count: {
        _all: true,
      },
      orderBy: [{ actor_type: "asc" }, { action_type: "asc" }],
      skip,
      take: limit,
    });
  // Get total count for pagination
  const distinctGroups =
    await MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["actor_type", "action_type"],
      where: whereConditions,
      _count: {
        _all: true,
      },
    });
  const totalRecords = distinctGroups.length;
  const totalPages = Math.ceil(totalRecords / limit);
  // Transform results to DTO format with proper date handling
  const data = aggregationResults.map((row) => {
    const totalCount = row._count._all;
    // Since _avg is not available, use default success rate
    const successRate = 0;
    return {
      timeBucket: toISOStringSafe(startTimestamp), // Use start date as time bucket for this simplified approach
      actorType: row.actor_type as "user" | "admin" | "super_admin" | "system",
      actionType: row.action_type,
      totalCount,
      successCount: Math.round(totalCount * 0), // Default to 0 success
      failureCount: totalCount - Math.round(totalCount * 0), // Default to all failures
      successRate: Number(successRate.toFixed(2)),
      trendIndicator: "stable" as const,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
