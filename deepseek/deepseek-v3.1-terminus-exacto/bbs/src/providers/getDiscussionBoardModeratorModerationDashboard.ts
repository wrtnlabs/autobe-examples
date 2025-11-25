import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboard";
import { IDiscussionBoardModerationOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationOverview";
import { IDiscussionBoardReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatistics";
import { INamedBreakdownByReason } from "@ORGANIZATION/PROJECT-api/lib/structures/INamedBreakdownByReason";
import { INamedBreakdownByPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/INamedBreakdownByPriority";
import { INamedBreakdownByActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/INamedBreakdownByActorType";
import { INamedBreakdownByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/INamedBreakdownByStatus";
import { IDiscussionBoardDailyTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDailyTrend";
import { INamedWeeklyComparison } from "@ORGANIZATION/PROJECT-api/lib/structures/INamedWeeklyComparison";
import { IDiscussionBoardModerationEfficiency } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationEfficiency";
import { IDiscussionBoardQueuePerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardQueuePerformance";
import { IDiscussionBoardQueueMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardQueueMetrics";
import { IDiscussionBoardViolationTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardViolationTrends";
import { IDiscussionBoardModeratorPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorPerformance";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationDashboard(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationDashboard> {
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Calculate date ranges for statistics using ISO strings
  const currentDate = new Date();
  const todayStart = toISOStringSafe(
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    ),
  );

  try {
    // Get overview metrics in a single batch
    const [
      totalPendingReports,
      reportsProcessedToday,
      activeModeratorsCount,
      escalatedReportsCount,
      criticalPriorityCount,
      resolvedReports,
    ] = await Promise.all([
      // Total pending reports
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: { status: "pending", deleted_at: null },
      }),

      // Reports processed today
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: {
          status: { in: ["resolved", "dismissed"] },
          updated_at: { gte: new Date(todayStart) },
          deleted_at: null,
        },
      }),

      // Active moderators count
      MyGlobal.prisma.discussion_board_moderation_queues.count({
        where: {
          assigned_at: { not: null },
          completed_at: null,
          deleted_at: null,
        },
      }),

      // Escalated reports count
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: { status: "escalated", deleted_at: null },
      }),

      // Critical priority count
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: { priority: "critical", deleted_at: null },
      }),

      // Resolved reports for average time calculation
      MyGlobal.prisma.discussion_board_content_reports.findMany({
        where: {
          status: { in: ["resolved", "dismissed"] },
          deleted_at: null,
        },
        select: { created_at: true, updated_at: true },
      }),
    ]);

    // Calculate average resolution time
    const averageResolutionTimeMinutes =
      resolvedReports.length > 0
        ? Math.round(
            resolvedReports.reduce((sum: number, report) => {
              const resolutionTime =
                report.updated_at.getTime() - report.created_at.getTime();
              return sum + resolutionTime;
            }, 0) /
              resolvedReports.length /
              (60 * 1000),
          )
        : 0;

    // Build overview
    const overview: IDiscussionBoardModerationOverview = {
      total_pending_reports: totalPendingReports,
      reports_processed_today: reportsProcessedToday,
      average_resolution_time_minutes: averageResolutionTimeMinutes,
      active_moderators_count: activeModeratorsCount,
      escalated_reports_count: escalatedReportsCount,
      critical_priority_count: criticalPriorityCount,
    };

    // Get report statistics in a single batch
    const [
      totalReportsSubmitted,
      reasonGroups,
      priorityGroups,
      actorTypeGroups,
      statusGroups,
    ] = await Promise.all([
      // Total reports submitted
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: { deleted_at: null },
      }),

      // Reports by reason
      MyGlobal.prisma.discussion_board_content_reports.groupBy({
        by: ["report_reason"],
        where: { deleted_at: null },
        _count: { id: true },
      }),

      // Reports by priority
      MyGlobal.prisma.discussion_board_content_reports.groupBy({
        by: ["priority"],
        where: { deleted_at: null },
        _count: { id: true },
      }),

      // Reports by actor type
      MyGlobal.prisma.discussion_board_content_reports.groupBy({
        by: ["actor_type"],
        where: { deleted_at: null },
        _count: { id: true },
      }),

      // Reports by status
      MyGlobal.prisma.discussion_board_content_reports.groupBy({
        by: ["status"],
        where: { deleted_at: null },
        _count: { id: true },
      }),
    ]);

    // Build breakdown objects
    const reports_by_reason: INamedBreakdownByReason = {
      spam:
        reasonGroups.find((r) => r.report_reason === "spam")?._count.id || 0,
      harassment:
        reasonGroups.find((r) => r.report_reason === "harassment")?._count.id ||
        0,
      inappropriate:
        reasonGroups.find((r) => r.report_reason === "inappropriate")?._count
          .id || 0,
      misinformation:
        reasonGroups.find((r) => r.report_reason === "misinformation")?._count
          .id || 0,
      copyright:
        reasonGroups.find((r) => r.report_reason === "copyright")?._count.id ||
        0,
      other:
        reasonGroups.find((r) => r.report_reason === "other")?._count.id || 0,
    };

    const reports_by_priority: INamedBreakdownByPriority = {
      low: priorityGroups.find((p) => p.priority === "low")?._count.id || 0,
      normal:
        priorityGroups.find((p) => p.priority === "normal")?._count.id || 0,
      high: priorityGroups.find((p) => p.priority === "high")?._count.id || 0,
      critical:
        priorityGroups.find((p) => p.priority === "critical")?._count.id || 0,
    };

    const reports_by_actor_type: INamedBreakdownByActorType = {
      member:
        actorTypeGroups.find((a) => a.actor_type === "member")?._count.id || 0,
      moderator:
        actorTypeGroups.find((a) => a.actor_type === "moderator")?._count.id ||
        0,
    };

    const reports_by_status: INamedBreakdownByStatus = {
      pending: statusGroups.find((s) => s.status === "pending")?._count.id || 0,
      under_review:
        statusGroups.find((s) => s.status === "under_review")?._count.id || 0,
      resolved:
        statusGroups.find((s) => s.status === "resolved")?._count.id || 0,
      dismissed:
        statusGroups.find((s) => s.status === "dismissed")?._count.id || 0,
      escalated:
        statusGroups.find((s) => s.status === "escalated")?._count.id || 0,
    };

    // Get daily trends for last 30 days
    const dailyTrendPromises = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1,
      );

      dailyTrendPromises.push(
        MyGlobal.prisma.discussion_board_content_reports
          .findMany({
            where: {
              created_at: { gte: dayStart, lt: dayEnd },
              deleted_at: null,
            },
            select: { priority: true, status: true },
          })
          .then((reports) => {
            const reportCount = reports.length;
            const averagePriority =
              reportCount > 0
                ? reports.reduce((sum: number, report) => {
                    const priorityMap = {
                      low: 1,
                      normal: 2,
                      high: 3,
                      critical: 4,
                    };
                    return (
                      sum +
                      priorityMap[report.priority as keyof typeof priorityMap]
                    );
                  }, 0) / reportCount
                : 1;

            const resolvedCount = reports.filter(
              (r) => r.status === "resolved",
            ).length;
            const resolutionRate =
              reportCount > 0 ? (resolvedCount / reportCount) * 100 : 0;

            return {
              date: toISOStringSafe(dayStart).split("T")[0] as string &
                tags.Format<"date">,
              report_count: reportCount,
              average_priority: Math.round(averagePriority),
              resolution_rate: Math.round(resolutionRate),
              trend_direction: "stable" as const,
            } as IDiscussionBoardDailyTrend;
          }),
      );
    }

    const dailyTrend = await Promise.all(dailyTrendPromises);
    dailyTrend.reverse(); // Order from oldest to newest

    // Get weekly comparison
    const lastWeekStart = toISOStringSafe(
      new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000),
    );
    const previousWeekStart = toISOStringSafe(
      new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000),
    );

    const [currentWeekReports, previousWeekReports] = await Promise.all([
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: {
          created_at: { gte: new Date(lastWeekStart) },
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.discussion_board_content_reports.count({
        where: {
          created_at: {
            gte: new Date(previousWeekStart),
            lt: new Date(lastWeekStart),
          },
          deleted_at: null,
        },
      }),
    ]);

    const changePercentage =
      previousWeekReports > 0
        ? ((currentWeekReports - previousWeekReports) / previousWeekReports) *
          100
        : currentWeekReports > 0
          ? 100
          : 0;

    const weekly_comparison: INamedWeeklyComparison = {
      current_week: currentWeekReports,
      previous_week: previousWeekReports,
      change_percentage: changePercentage,
    };

    // Build report statistics
    const report_statistics: IDiscussionBoardReportStatistics = {
      total_reports_submitted: totalReportsSubmitted,
      reports_by_reason,
      reports_by_priority,
      reports_by_actor_type,
      reports_by_status,
      daily_trend: dailyTrend,
      weekly_comparison,
    };

    // Calculate moderation efficiency metrics
    const [responseTimeQueues, totalAssignments, timeoutCount] =
      await Promise.all([
        // Response time data
        MyGlobal.prisma.discussion_board_moderation_queues.findMany({
          where: {
            assigned_at: { not: null },
            started_at: { not: null },
            deleted_at: null,
          },
          select: { created_at: true, assigned_at: true },
        }),

        // Total assignments for timeout rate
        MyGlobal.prisma.discussion_board_moderation_queues.count({
          where: { assigned_at: { not: null }, deleted_at: null },
        }),

        // Timeout count
        MyGlobal.prisma.discussion_board_moderation_queues.count({
          where: { timeout_at: { not: null }, deleted_at: null },
        }),
      ]);

    const averageResponseTimeMinutes =
      responseTimeQueues.length > 0
        ? Math.round(
            responseTimeQueues.reduce((sum: number, queue) => {
              const responseTime =
                queue.assigned_at!.getTime() - queue.created_at.getTime();
              return sum + responseTime;
            }, 0) /
              responseTimeQueues.length /
              (60 * 1000),
          )
        : 0;

    const overallResolutionRate =
      totalReportsSubmitted > 0
        ? ((reports_by_status.resolved + reports_by_status.dismissed) /
            totalReportsSubmitted) *
          100
        : 0;

    const escalationRate =
      totalReportsSubmitted > 0
        ? (reports_by_status.escalated / totalReportsSubmitted) * 100
        : 0;

    const timeoutRate =
      totalAssignments > 0 ? (timeoutCount / totalAssignments) * 100 : 0;

    const moderation_efficiency: IDiscussionBoardModerationEfficiency = {
      average_response_time_minutes: averageResponseTimeMinutes,
      average_resolution_time_minutes: averageResolutionTimeMinutes,
      overall_resolution_rate: Math.round(overallResolutionRate),
      escalation_rate: Math.round(escalationRate),
      moderator_utilization_rate: Math.round(
        (activeModeratorsCount / 10) * 100,
      ), // Assuming 10 total moderators
      timeout_rate: Math.round(timeoutRate),
    };

    // Calculate queue performance metrics
    const queueMetricsPromises = [
      "general",
      "urgent",
      "appeals",
      "escalated",
    ].map(async (queueType) => {
      const queues =
        await MyGlobal.prisma.discussion_board_moderation_queues.findMany({
          where: {
            queue_type: queueType,
            deleted_at: null,
          },
          select: {
            assigned_at: true,
            started_at: true,
            completed_at: true,
            timeout_at: true,
            created_at: true,
          },
        });

      const currentBacklogCount = queues.filter(
        (q) => q.assigned_at && !q.completed_at,
      ).length;

      const waitTimes = queues
        .filter((q) => q.assigned_at && q.started_at)
        .map((q) => q.started_at!.getTime() - q.assigned_at!.getTime());

      const processingTimes = queues
        .filter((q) => q.started_at && q.completed_at)
        .map((q) => q.completed_at!.getTime() - q.started_at!.getTime());

      const averageWaitTimeMinutes =
        waitTimes.length > 0
          ? Math.round(
              waitTimes.reduce((a: number, b: number) => a + b) /
                waitTimes.length /
                (60 * 1000),
            )
          : 0;

      const averageProcessingTimeMinutes =
        processingTimes.length > 0
          ? Math.round(
              processingTimes.reduce((a: number, b: number) => a + b) /
                processingTimes.length /
                (60 * 1000),
            )
          : 0;

      const completedCount = queues.filter((q) => q.completed_at).length;
      const completionRate =
        queues.length > 0 ? (completedCount / queues.length) * 100 : 0;

      const timeoutCount = queues.filter((q) => q.timeout_at).length;
      const timeoutRate =
        queues.length > 0 ? (timeoutCount / queues.length) * 100 : 0;

      const moderatorCount =
        await MyGlobal.prisma.discussion_board_moderation_queues.count({
          where: {
            queue_type: queueType,
            assigned_at: { not: null },
            completed_at: null,
            deleted_at: null,
          },
        });

      return {
        queue_type: queueType as "general" | "urgent" | "appeals" | "escalated",
        current_backlog_count: currentBacklogCount,
        average_wait_time_minutes: averageWaitTimeMinutes,
        average_processing_time_minutes: averageProcessingTimeMinutes,
        completion_rate: Math.round(completionRate),
        timeout_rate: Math.round(timeoutRate),
        moderator_count: moderatorCount,
      } as IDiscussionBoardQueueMetrics;
    });

    const queueMetrics = await Promise.all(queueMetricsPromises);

    const queue_performance: IDiscussionBoardQueuePerformance = {
      general_queue_metrics: queueMetrics.find(
        (q) => q.queue_type === "general",
      )!,
      urgent_queue_metrics: queueMetrics.find(
        (q) => q.queue_type === "urgent",
      )!,
      appeals_queue_metrics: queueMetrics.find(
        (q) => q.queue_type === "appeals",
      )!,
      escalated_queue_metrics: queueMetrics.find(
        (q) => q.queue_type === "escalated",
      )!,
      total_queue_wait_time_minutes: queueMetrics.reduce(
        (sum: number, q) => sum + q.average_wait_time_minutes,
        0,
      ),
      assignment_success_rate: Math.round(
        queueMetrics.reduce((sum: number, q) => sum + q.completion_rate, 0) /
          queueMetrics.length,
      ),
    };

    // Calculate violation trends
    const commonViolationTypes =
      await MyGlobal.prisma.discussion_board_content_reports
        .groupBy({
          by: ["report_reason"],
          where: { deleted_at: null },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 5,
        })
        .then((results) => results.map((r) => r.report_reason));

    const repeatOffenderCount =
      await MyGlobal.prisma.discussion_board_content_reports
        .groupBy({
          by: ["actor_type"],
          where: { deleted_at: null },
          having: { id: { _count: { gt: 3 } } },
          _count: { id: true },
        })
        .then((results) =>
          results.reduce((sum: number, r) => sum + r._count.id, 0),
        );

    const violation_trends: IDiscussionBoardViolationTrends = {
      common_violation_types: commonViolationTypes,
      violation_trend_direction: "stable",
      successful_intervention_rate: Math.round(overallResolutionRate),
      repeat_offender_count: repeatOffenderCount,
      emerging_issue_categories: [],
      preventive_measure_effectiveness: 75,
    };

    // Create aggregated moderator performance (single object instead of array)
    const totalModerators =
      await MyGlobal.prisma.discussion_board_moderators.count({
        where: { deleted_at: null },
      });

    const moderator_performance: IDiscussionBoardModeratorPerformance = {
      id: v4() as string & tags.Format<"uuid">,
      email: "aggregated@moderation.dashboard",
      username: "aggregated_moderator_performance",
      display_name: "Aggregated Moderator Performance",
      bio: "Aggregated performance metrics across all moderators",
      moderation_level: "aggregated",
      reports_resolved_count:
        reports_by_status.resolved + reports_by_status.dismissed,
      average_resolution_time_minutes: averageResolutionTimeMinutes,
      escalation_rate: Math.round(escalationRate),
      quality_score: Math.round(overallResolutionRate),
      current_workload_count: activeModeratorsCount,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    };

    // Return complete dashboard
    return {
      overview,
      report_statistics,
      moderation_efficiency,
      queue_performance,
      violation_trends,
      moderator_performance,
      created_at: now,
    };
  } catch (error) {
    throw new HttpException(
      "Failed to generate moderation dashboard: " +
        (error instanceof Error ? error.message : "Unknown error"),
      500,
    );
  }
}
