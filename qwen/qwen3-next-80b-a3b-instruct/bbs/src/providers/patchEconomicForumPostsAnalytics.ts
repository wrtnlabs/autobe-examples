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
import { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import { IPageIEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconomicForumPostsAnalytics(props: {
  body: IEconomicForumPost.IRequest;
}): Promise<IPageIEconomicForumPost> {
  // Extract filtering parameters from request
  const {
    start_date: startDate,
    end_date: endDate,
    report_reason: reportReason,
    admin_action_status: adminActionStatus,
  } = props.body;
  // Build WHERE conditions for filtering posts
  const postWhere: Prisma.economic_forum_postsWhereInput = {};
  // Apply date filters if provided
  if (startDate || endDate) {
    postWhere.created_at = {};
    if (startDate) postWhere.created_at.gte = toISOStringSafe(startDate);
    if (endDate) postWhere.created_at.lte = toISOStringSafe(endDate);
  }
  // Build conditions for system audits (admin actions)
  const auditWhere: Prisma.economic_forum_system_auditsWhereInput = {};
  if (adminActionStatus) {
    auditWhere.action = adminActionStatus;
  }
  // Build conditions for reports
  const reportWhere: Prisma.economic_forum_post_reportsWhereInput = {};
  if (reportReason) {
    reportWhere.reason = reportReason;
  }
  // Execute single query with all aggregations using Prisma raw SQL expressions
  // This query joins posts with moderation_flags (for reported_posts), posts with reports (for avg_report_to_action_hours), and posts with system_audits (for approved/deleted posts)
  const queryParams: any[] = [];
  if (reportReason) queryParams.push(reportReason);
  if (adminActionStatus) queryParams.push(adminActionStatus);
  if (startDate) queryParams.push(toISOStringSafe(startDate));
  if (endDate) queryParams.push(toISOStringSafe(endDate));
  // Cast template literal to string for $queryRawUnsafe
  const sqlTemplate: string = `
    SELECT 
      COUNT(DISTINCT pf.id) AS total_posts,
      COUNT(DISTINCT mf.post_id) AS reported_posts,
      COUNT(DISTINCT CASE WHEN sa.action = 'approved' THEN sa.post_id END) AS approved_posts,
      COUNT(DISTINCT CASE WHEN sa.action = 'deleted' THEN sa.post_id END) AS deleted_posts,
      AVG(TIMESTAMPDIFF(HOUR, pr.created_at, sa.created_at)) AS avg_report_to_action_hours,
      (COUNT(DISTINCT CASE WHEN sa.action = 'deleted' THEN sa.post_id END) * 100.0 / NULLIF(COUNT(DISTINCT mf.post_id), 0)) AS deletion_ratio,
      AVG(CHAR_LENGTH(pf.content) - CHAR_LENGTH(REPLACE(pf.content, ' ', '')) + 1) AS average_post_length
    FROM economic_forum_posts pf
    LEFT JOIN economic_forum_moderation_flags mf ON pf.id = mf.post_id
    LEFT JOIN economic_forum_post_reports pr ON pf.id = pr.post_id ${reportReason ? "AND pr.reason = ?" : ""}
    LEFT JOIN economic_forum_system_audits sa ON pf.id = sa.post_id ${adminActionStatus ? "AND sa.action = ?" : ""}
    WHERE pf.deleted_at IS NULL
      ${startDate ? "AND pf.created_at >= ?" : ""}
      ${endDate ? "AND pf.created_at <= ?" : ""}
  `;
  const result = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      total_posts: number;
      reported_posts: number;
      approved_posts: number;
      deleted_posts: number;
      avg_report_to_action_hours: number | null;
      deletion_ratio: number | null;
      average_post_length: number | null;
    }>
  >(sqlTemplate, queryParams);
  // Extract and validate results
  const row = result[0]; // Expected to return exactly one row
  // Calculate avg_report_to_action_hours safely (null handling)
  const avgReportToActionHours =
    row?.avg_report_to_action_hours !== null
      ? row.avg_report_to_action_hours
      : 0;
  // Calculate deletion_ratio safely (avoid division by zero)
  const deletionRatio = row?.reported_posts > 0 ? row.deletion_ratio : 0;
  // Return computed analytics summary in IPageIEconomicForumPost format
  return {
    pagination: {
      current: 1,
      limit: 100,
      records: 1, // Single record containing all aggregated metrics
      pages: 1,
    } satisfies IPage.IPagination,
    data: [
      {
        total_posts: row?.total_posts || 0,
        reported_posts: row?.reported_posts || 0,
        approved_posts: row?.approved_posts || 0,
        deleted_posts: row?.deleted_posts || 0,
        avg_report_to_action_hours: avgReportToActionHours,
        deletion_ratio: deletionRatio,
        average_post_length: row?.average_post_length || 0,
      },
    ],
  };
}
