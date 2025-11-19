import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationStatistics";
import { IDiscussionBoardDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDateRange";
import { IDiscussionBoardReportVolumeMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportVolumeMetrics";
import { IDiscussionBoardEfficiencyMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardEfficiencyMetrics";
import { IDiscussionBoardQueuePerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardQueuePerformanceMetrics";
import { IDiscussionBoardModeratorWorkloadMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorWorkloadMetrics";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationStatistics(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationStatistics.IRequest;
}): Promise<IDiscussionBoardModerationStatistics> {
  // Parse date strings to Date objects for Prisma queries
  const startDate = new Date(props.body.dateRange.startDate + "T00:00:00.000Z");
  const endDate = new Date(props.body.dateRange.endDate + "T23:59:59.999Z");

  // Calculate time boundaries for different periods
  const now = new Date();
  const dailyStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weeklyStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthlyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Base where conditions for content reports
  const baseReportWhere: Record<string, unknown> = {
    created_at: {
      gte: startDate,
      lte: endDate,
    },
    deleted_at: null,
  };

  // Apply optional filters to base conditions
  if (
    props.body.priorityLevelFilter &&
    props.body.priorityLevelFilter !== "all"
  ) {
    baseReportWhere.priority = props.body.priorityLevelFilter;
  }

  if (props.body.reportTypeFilter && props.body.reportTypeFilter !== "all") {
    baseReportWhere.report_reason = props.body.reportTypeFilter;
  }

  // Base where conditions for moderation queues - use direct field references
  const baseQueueWhere: Record<string, unknown> = {
    discussion_board_content_report_id: {
      in: await MyGlobal.prisma.discussion_board_content_reports
        .findMany({
          where: {
            created_at: {
              gte: startDate,
              lte: endDate,
            },
            deleted_at: null,
          },
          select: { id: true },
        })
        .then((reports) => reports.map((r) => r.id)),
    },
    deleted_at: null,
  };

  // Apply queue type filter if specified
  if (props.body.queueTypeFilter && props.body.queueTypeFilter !== "all") {
    baseQueueWhere.queue_type = props.body.queueTypeFilter;
  }

  // Get report volume metrics
  const [
    dailyReports,
    weeklyReports,
    monthlyReports,
    pendingReports,
    totalReports,
  ] = await Promise.all([
    // Daily reports (last 24 hours)
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        ...baseReportWhere,
        created_at: {
          gte: dailyStart,
          lte: now,
        },
      },
    }),
    // Weekly reports (last 7 days)
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        ...baseReportWhere,
        created_at: {
          gte: weeklyStart,
          lte: now,
        },
      },
    }),
    // Monthly reports (last 30 days)
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        ...baseReportWhere,
        created_at: {
          gte: monthlyStart,
          lte: now,
        },
      },
    }),
    // Pending reports
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        ...baseReportWhere,
        status: "pending",
      },
    }),
    // Total reports in date range for percentage calculations
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: baseReportWhere,
    }),
  ]);

  // Get efficiency metrics data
  const [assignedQueues, completedQueues, escalationActions] =
    await Promise.all([
      // Get queues with assignment times for response time calculation
      MyGlobal.prisma.discussion_board_moderation_queues.findMany({
        where: {
          ...baseQueueWhere,
          assigned_at: { not: null },
        },
        select: {
          assigned_at: true,
          discussion_board_content_report_id: true,
        },
      }),
      // Get completed queues for resolution time calculation
      MyGlobal.prisma.discussion_board_moderation_queues.findMany({
        where: {
          ...baseQueueWhere,
          assigned_at: { not: null },
          completed_at: { not: null },
        },
        select: {
          assigned_at: true,
          completed_at: true,
        },
      }),
      // Get escalation actions
      MyGlobal.prisma.discussion_board_moderation_actions.count({
        where: {
          escalation_level: { in: ["escalated", "critical"] },
          discussion_board_content_report_id: {
            in: await MyGlobal.prisma.discussion_board_content_reports
              .findMany({
                where: {
                  created_at: {
                    gte: startDate,
                    lte: endDate,
                  },
                  deleted_at: null,
                },
                select: { id: true },
              })
              .then((reports) => reports.map((r) => r.id)),
          },
          deleted_at: null,
        },
      }),
    ]);

  // Get report creation times for assigned queues
  const reportCreationTimes = await Promise.all(
    assignedQueues.map(async (queue) => {
      const report =
        await MyGlobal.prisma.discussion_board_content_reports.findUnique({
          where: { id: queue.discussion_board_content_report_id },
          select: { created_at: true },
        });
      return report?.created_at;
    }),
  );

  // Calculate efficiency metrics with proper null checks
  const responseTimes = assignedQueues
    .map((queue, index) => {
      const reportTime = reportCreationTimes[index]?.getTime();
      const assignTime = queue.assigned_at?.getTime();
      if (!reportTime || !assignTime) return null;
      return (assignTime - reportTime) / (1000 * 60 * 60); // Convert to hours
    })
    .filter((time): time is number => time !== null);

  const resolutionTimes = completedQueues
    .map((queue) => {
      const assignTime = queue.assigned_at?.getTime();
      const completeTime = queue.completed_at?.getTime();
      if (!assignTime || !completeTime) return null;
      return (completeTime - assignTime) / (1000 * 60 * 60); // Convert to hours
    })
    .filter((time): time is number => time !== null);

  const averageResponseTimeHours =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length
      : 0;

  const averageResolutionTimeHours =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) /
        resolutionTimes.length
      : 0;

  const resolutionRatePercentage =
    assignedQueues.length > 0
      ? (completedQueues.length / assignedQueues.length) * 100
      : 0;

  const escalationRatePercentage =
    totalReports > 0 ? (escalationActions / totalReports) * 100 : 0;

  // Get queue performance metrics
  const [generalQueues, urgentQueues, timeoutIncidents] = await Promise.all([
    // General queue wait times
    MyGlobal.prisma.discussion_board_moderation_queues.findMany({
      where: {
        ...baseQueueWhere,
        queue_type: "general",
        assigned_at: { not: null },
      },
      select: {
        assigned_at: true,
        discussion_board_content_report_id: true,
      },
    }),
    // Urgent queue wait times
    MyGlobal.prisma.discussion_board_moderation_queues.findMany({
      where: {
        ...baseQueueWhere,
        queue_type: "urgent",
        assigned_at: { not: null },
      },
      select: {
        assigned_at: true,
        discussion_board_content_report_id: true,
      },
    }),
    // Timeout incidents
    MyGlobal.prisma.discussion_board_moderation_queues.count({
      where: {
        ...baseQueueWhere,
        timeout_at: { not: null },
        completed_at: null,
      },
    }),
  ]);

  // Get report creation times for queue performance metrics
  const generalReportTimes = await Promise.all(
    generalQueues.map(async (queue) => {
      const report =
        await MyGlobal.prisma.discussion_board_content_reports.findUnique({
          where: { id: queue.discussion_board_content_report_id },
          select: { created_at: true },
        });
      return report?.created_at;
    }),
  );

  const urgentReportTimes = await Promise.all(
    urgentQueues.map(async (queue) => {
      const report =
        await MyGlobal.prisma.discussion_board_content_reports.findUnique({
          where: { id: queue.discussion_board_content_report_id },
          select: { created_at: true },
        });
      return report?.created_at;
    }),
  );

  // Calculate queue wait times with proper null checks
  const generalWaitTimes = generalQueues
    .map((queue, index) => {
      const reportTime = generalReportTimes[index]?.getTime();
      const assignTime = queue.assigned_at?.getTime();
      if (!reportTime || !assignTime) return null;
      return (assignTime - reportTime) / (1000 * 60 * 60); // Convert to hours
    })
    .filter((time): time is number => time !== null);

  const urgentWaitTimes = urgentQueues
    .map((queue, index) => {
      const reportTime = urgentReportTimes[index]?.getTime();
      const assignTime = queue.assigned_at?.getTime();
      if (!reportTime || !assignTime) return null;
      return (assignTime - reportTime) / (1000 * 60 * 60); // Convert to hours
    })
    .filter((time): time is number => time !== null);

  const generalQueueWaitTimeHours =
    generalWaitTimes.length > 0
      ? generalWaitTimes.reduce((sum, time) => sum + time, 0) /
        generalWaitTimes.length
      : 0;

  const urgentQueueWaitTimeHours =
    urgentWaitTimes.length > 0
      ? urgentWaitTimes.reduce((sum, time) => sum + time, 0) /
        urgentWaitTimes.length
      : 0;

  const assignmentCompletionRatePercentage =
    assignedQueues.length > 0
      ? (completedQueues.length / assignedQueues.length) * 100
      : 0;

  // Get moderator workload metrics
  const [activeModerators, moderatorAssignments] = await Promise.all([
    // Active moderators
    MyGlobal.prisma.discussion_board_moderators.count({
      where: {
        deleted_at: null,
      },
    }),
    // Moderator assignments for workload calculation
    MyGlobal.prisma.discussion_board_moderation_queues.groupBy({
      by: ["discussion_board_moderator_id"],
      _count: {
        id: true,
      },
      where: {
        ...baseQueueWhere,
        assigned_at: { not: null },
      },
    }),
  ]);

  // Calculate workload metrics
  const assignmentCounts = moderatorAssignments.map((group) => group._count.id);
  const averageReportsPerModerator =
    assignmentCounts.length > 0
      ? assignmentCounts.reduce((sum, count) => sum + count, 0) /
        assignmentCounts.length
      : 0;

  const meanWorkload =
    assignmentCounts.length > 0
      ? assignmentCounts.reduce((sum, count) => sum + count, 0) /
        assignmentCounts.length
      : 0;

  const workloadDistributionVariance =
    assignmentCounts.length > 0
      ? assignmentCounts.reduce(
          (sum, count) => sum + Math.pow(count - meanWorkload, 2),
          0,
        ) / assignmentCounts.length
      : 0;

  // Calculate trend direction
  const previousPeriodStart = new Date(
    startDate.getTime() - (endDate.getTime() - startDate.getTime()),
  );
  const previousPeriodEnd = new Date(startDate.getTime() - 1);

  const previousPeriodCount =
    await MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        created_at: {
          gte: previousPeriodStart,
          lte: previousPeriodEnd,
        },
        deleted_at: null,
      },
    });

  const trendDirection =
    totalReports > previousPeriodCount
      ? "increasing"
      : totalReports < previousPeriodCount
        ? "decreasing"
        : "stable";

  return {
    id: v4(),
    reportVolumeMetrics: {
      dailyReports,
      weeklyReports,
      monthlyReports,
      pendingReports,
      trendDirection,
    },
    efficiencyMetrics: {
      averageResponseTimeHours,
      averageResolutionTimeHours,
      resolutionRatePercentage,
      escalationRatePercentage,
    },
    queuePerformanceMetrics: {
      generalQueueWaitTimeHours,
      urgentQueueWaitTimeHours,
      assignmentCompletionRatePercentage,
      timeoutIncidentsCount: timeoutIncidents,
    },
    moderatorWorkloadMetrics: {
      activeModeratorsCount: activeModerators,
      averageReportsPerModerator,
      workloadDistributionVariance,
    },
    createdAt: toISOStringSafe(new Date()),
  };
}
