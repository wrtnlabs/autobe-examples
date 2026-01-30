import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumModerationFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumModerationFlag";
import { IEconomicForumSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumSystemAudit";
import { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconomicForumAdminSystemAnalyticsModeration(props: {
  admin: AdminPayload;
  body: IEconomicForumModerationFlag;
}): Promise<IEconomicForumSystemAudit> {
  const { pagination, sort_by, order, date_range, report_reason } = props.body;
  // Extract pagination values
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;
  // Build where conditions for reports
  const whereReports: Prisma.economic_forum_post_reportsWhereInput = {};
  // Filter by date range if provided
  if (date_range) {
    whereReports.created_at = {
      gte: toISOStringSafe(date_range.start),
      lte: toISOStringSafe(date_range.end),
    };
  }
  // Filter by report reason if provided
  if (report_reason) {
    whereReports.reason = report_reason;
  }
  // Get total reports matching criteria
  const totalReports = await MyGlobal.prisma.economic_forum_post_reports.count({
    where: whereReports,
  });
  // Get top 5 report reasons with counts
  const topReportReasons: IEconomicForumPostReport[] =
    await MyGlobal.prisma.economic_forum_post_reports
      .groupBy({
        by: ["reason"],
        where: whereReports,
        orderBy: { _count: { id: "desc" } },
        take: 5,
        _count: {
          id: true,
        },
      })
      .then((result) =>
        result.map(
          (item) =>
            ({
              reason: item.reason || "",
              count: item._count?.id || 0,
            }) as IEconomicForumPostReport,
        ),
      );
  // Calculate total approved and total deleted counts using Prisma count with subquery
  const postReportIds = await MyGlobal.prisma.economic_forum_post_reports
    .findMany({
      where: whereReports,
      select: { id: true },
    })
    .then((r) => r.map((item) => item.id));
  const totalApproved =
    await MyGlobal.prisma.economic_forum_moderation_flags.count({
      where: {
        action_type: "approve", // Corrected from 'action' to 'action_type' based on schema
        post_report_id: { in: postReportIds },
      },
    });
  const totalDeleted =
    await MyGlobal.prisma.economic_forum_moderation_flags.count({
      where: {
        action_type: "delete", // Corrected from 'action' to 'action_type' based on schema
        post_report_id: { in: postReportIds },
      },
    });
  // Calculate average response time in seconds by joining tables
  const avgResponseTimeResult = await MyGlobal.prisma.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM (m.actioned_at - r.created_at))) as avg_seconds
    FROM economic_forum_post_reports r
    JOIN economic_forum_moderation_flags m ON r.id = m.post_report_id
    WHERE r.created_at >= ${date_range?.start ? toISOStringSafe(date_range.start) : toISOStringSafe(new Date(0))}
    AND r.created_at <= ${date_range?.end ? toISOStringSafe(date_range.end) : toISOStringSafe(new Date())}
    AND (r.reason = ${report_reason} OR ${report_reason} IS NULL)
    AND m.actioned_at IS NOT NULL
  `;
  const avgResponseTime = (avgResponseTimeResult as any[])[0]?.avg_seconds || 0;
  // Prepare pagination metadata
  const paginationMetadata: IPage.IPagination = {
    current: page,
    limit,
    records: totalReports,
    pages: Math.ceil(totalReports / limit),
  };
  return {
    totalReports,
    totalApproved,
    totalDeleted,
    averageResponseTime: Number(avgResponseTime),
    topReportReasons,
    pagination: paginationMetadata,
  };
}
