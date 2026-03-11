import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardSuperAdminGovernanceOversight(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardAuditLog.IInvert> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Parallel queries for performance
  const [
    adminCounts,
    auditLogActions,
    banStats,
    adminRequestMetrics,
    sectionStats,
  ] = await Promise.all([
    // Administrator counts
    MyGlobal.prisma.$transaction(async (tx) => {
      const regularAdmins = await tx.discussion_board_admins.count({
        where: { deleted_at: null, admin_grade: "regular" },
      });
      const superAdmins = await tx.discussion_board_super_admins.count({
        where: { deleted_at: null },
      });
      return { regularAdmins, superAdmins };
    }),
    // Audit log action statistics (last 30 days)
    MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["action_type"],
      where: { created_at: { gte: thirtyDaysAgo } },
      _count: { action_type: true },
    }),
    // Ban statistics
    MyGlobal.prisma.$transaction(async (tx) => {
      const activeBans = await tx.discussion_board_user_bans.count({
        where: { status: "active", deleted_at: null },
      });
      const recentBans = await tx.discussion_board_user_bans.count({
        where: {
          status: "active",
          deleted_at: null,
          banned_at: { gte: sevenDaysAgo },
        },
      });
      const banReasons = await tx.discussion_board_user_bans.groupBy({
        by: ["reason"],
        where: { status: "active", deleted_at: null },
        _count: { reason: true },
      });
      return { activeBans, recentBans, banReasons };
    }),
    // Admin request decision metrics
    MyGlobal.prisma.$transaction(async (tx) => {
      const totalRequests = await tx.discussion_board_admin_requests.count({
        where: { deleted_at: null },
      });
      const approvedRequests = await tx.discussion_board_admin_requests.count({
        where: { deleted_at: null, status: "approved" },
      });
      const rejectedRequests = await tx.discussion_board_admin_requests.count({
        where: { deleted_at: null, status: "rejected" },
      });
      // Calculate average response time (simplified)
      const allRequests = await tx.discussion_board_admin_requests.findMany({
        where: { deleted_at: null, status: { in: ["approved", "rejected"] } },
        select: { created_at: true, updated_at: true },
      });
      const responseTimes = allRequests
        .map((req) => req.updated_at.getTime() - req.created_at.getTime())
        .filter((time) => time > 0);
      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(
              responseTimes.reduce((a, b) => a + b, 0) /
                responseTimes.length /
                (1000 * 60 * 60),
            ) // hours
          : 0;
      return {
        totalRequests,
        approvedRequests,
        rejectedRequests,
        avgResponseTime,
      };
    }),
    // Section and content statistics
    MyGlobal.prisma.$transaction(async (tx) => {
      const activeSections = await tx.discussion_board_sections.count({
        where: { deleted_at: null },
      });
      const publishedArticles = await tx.discussion_board_articles.count({
        where: { deleted_at: null, status: "published" },
      });
      const totalComments = await tx.discussion_board_comments.count({
        where: { deleted_at: null },
      });
      return { activeSections, publishedArticles, totalComments };
    }),
  ]);
  // Transform ban reasons to dictionary
  const banReasonDistribution = Object.fromEntries(
    banStats.banReasons.map((br) => [br.reason, br._count.reason]),
  );
  // Transform action statistics to dictionary
  const actionStatistics = Object.fromEntries(
    auditLogActions.map((al) => [al.action_type, al._count.action_type]),
  );
  // Calculate governance decision rates
  const approvalRate =
    adminRequestMetrics.totalRequests > 0
      ? adminRequestMetrics.approvedRequests / adminRequestMetrics.totalRequests
      : 0;
  const rejectionRate =
    adminRequestMetrics.totalRequests > 0
      ? adminRequestMetrics.rejectedRequests / adminRequestMetrics.totalRequests
      : 0;
  return {
    id: v4(),
    action_type: "governance_oversight",
    action_details:
      "Aggregated governance oversight data for platform health evaluation",
    created_at: new Date().toISOString(),
    administrator_counts: {
      regular_admins: adminCounts.regularAdmins,
      super_admins: adminCounts.superAdmins,
      total_admins: adminCounts.regularAdmins + adminCounts.superAdmins,
    } satisfies IDiscussionBoardAuditLog.IInvert["administrator_counts"],
    action_statistics: actionStatistics,
    ban_patterns: {
      active_bans: banStats.activeBans,
      recent_bans: banStats.recentBans,
      ban_reasons: banReasonDistribution,
    } satisfies IDiscussionBoardAuditLog.IInvert["ban_patterns"],
    governance_decisions: {
      approval_rate: approvalRate,
      rejection_rate: rejectionRate,
      average_response_time: adminRequestMetrics.avgResponseTime,
    } satisfies IDiscussionBoardAuditLog.IInvert["governance_decisions"],
  } satisfies IDiscussionBoardAuditLog.IInvert;
}
