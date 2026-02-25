import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogTransformer } from "../transformers/DiscussionBoardAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemReportsSummary(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAuditLog.IRequest;
}): Promise<IDiscussionBoardAuditLog> {
  const {
    created_at_start,
    created_at_end,
    updated_at_start,
    updated_at_end,
    search_term,
    success,
    action_type,
    actor_type,
    target_user_id,
    target_admin_id,
    target_super_admin_id,
    target_article_id,
    target_comment_id,
    target_section_id,
  } = props.body;
  // Build where clause based on filter parameters
  const whereInput: Prisma.discussion_board_audit_logsWhereInput = {
    ...(action_type && { action_type }),
    ...(actor_type && { actor_type }),
    ...(target_user_id && { target_user_id }),
    ...(target_admin_id && { target_admin_id }),
    ...(target_super_admin_id && { target_super_admin_id }),
    ...(target_article_id && { target_article_id }),
    ...(target_comment_id && { target_comment_id }),
    ...(target_section_id && { target_section_id }),
    ...(created_at_start && {
      created_at: { gte: new Date(created_at_start) },
    }),
    ...(created_at_end && { created_at: { lte: new Date(created_at_end) } }),
    ...(updated_at_start && {
      updated_at: { gte: new Date(updated_at_start) },
    }),
    ...(updated_at_end && { updated_at: { lte: new Date(updated_at_end) } }),
    ...(success !== undefined && { success }),
    ...(search_term && {
      description: { contains: search_term, mode: "insensitive" },
    }),
  };
  // Query performance metrics with aggregation
  const avgResponseTime =
    await MyGlobal.prisma.discussion_board_performance_metrics.aggregate({
      where: { metric_type: "response_time" },
      _avg: { metric_value: true },
    });
  const cpuUsageStats =
    await MyGlobal.prisma.discussion_board_performance_metrics.aggregate({
      where: { metric_type: "cpu_usage" },
      _avg: { metric_value: true },
      _max: { metric_value: true },
      _min: { metric_value: true },
    });
  // Aggregate section and article statistics
  const totalSectionViews =
    await MyGlobal.prisma.discussion_board_section_statistics.aggregate({
      _sum: { view_count: true },
    });
  const totalArticles =
    await MyGlobal.prisma.discussion_board_section_statistics.aggregate({
      _sum: { article_count: true },
    });
  // Aggregate article statistics
  const averageTimeSpent =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      _avg: { average_time_spent_seconds: true },
    });
  const totalTimeSpent =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      _sum: { total_time_spent_seconds: true },
    });
  // Aggregate system activities
  const successfulActions =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: { success_status: true },
    });
  const failedActions =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: { success_status: false },
    });
  // Create summary metadata
  const summaryMetadata = {
    performance_metrics: {
      avg_response_time: avgResponseTime._avg.metric_value,
      avg_cpu_usage: cpuUsageStats._avg.metric_value,
      max_cpu_usage: cpuUsageStats._max.metric_value,
      min_cpu_usage: cpuUsageStats._min.metric_value,
    },
    section_statistics: {
      total_section_views: totalSectionViews._sum.view_count,
      total_articles: totalArticles._sum.article_count,
    },
    article_analytics: {
      avg_time_spent_per_article:
        averageTimeSpent._avg.average_time_spent_seconds,
      total_time_spent_platform: totalTimeSpent._sum.total_time_spent_seconds,
    },
    system_activities: {
      successful_actions: successfulActions,
      failed_actions: failedActions,
      total_actions: successfulActions + failedActions,
      success_rate:
        (successfulActions / (successfulActions + failedActions)) * 100,
    },
    report_generated_at: new Date().toISOString(),
    generated_by_admin: props.admin.id,
  };
  // Find latest audit log to attach summary to
  const latestAuditLog =
    await MyGlobal.prisma.discussion_board_audit_logs.findFirst({
      where: whereInput,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAuditLogTransformer.select(),
    });
  if (!latestAuditLog) {
    // Create a new audit log entry for the summary report
    const createdLog = await MyGlobal.prisma.discussion_board_audit_logs.create(
      {
        data: {
          id: v4(),
          actor_id: props.admin.id,
          actor_type: "admin",
          action_type: "system_summary_report",
          action_subtype: "aggregated_statistics",
          description: `System summary report generated by admin ${props.admin.id}`,
          ip_address: null,
          user_agent: null,
          metadata: JSON.stringify(summaryMetadata),
          success: true,
          error_message: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        ...DiscussionBoardAuditLogTransformer.select(),
      },
    );
    return DiscussionBoardAuditLogTransformer.transform(createdLog);
  }
  // Update existing latest audit log with summary data
  const updatedLog = await MyGlobal.prisma.discussion_board_audit_logs.update({
    where: { id: latestAuditLog.id },
    data: {
      metadata: JSON.stringify({
        ...(latestAuditLog.metadata ? JSON.parse(latestAuditLog.metadata) : {}),
        summary_report: summaryMetadata,
      }),
      updated_at: new Date(),
    },
    ...DiscussionBoardAuditLogTransformer.select(),
  });
  return DiscussionBoardAuditLogTransformer.transform(updatedLog);
}
