import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IDiscussionBoardContentModerationQueueStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminQueuesAnalytics(props: {
  superAdmin: SuperAdminPayload;
}): Promise<IDiscussionBoardContentModerationQueueAssignment.IAnalytic> {
  // Get current timestamp using existing utility
  const timestamp = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  // Count queues by moderation status using individual queries
  const [pendingCount, underReviewCount, resolvedCount, dismissedCount] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_content_moderation_queues.count({
        where: { moderation_status: "pending" },
      }),
      MyGlobal.prisma.discussion_board_content_moderation_queues.count({
        where: { moderation_status: "under_review" },
      }),
      MyGlobal.prisma.discussion_board_content_moderation_queues.count({
        where: { moderation_status: "resolved" },
      }),
      MyGlobal.prisma.discussion_board_content_moderation_queues.count({
        where: { moderation_status: "dismissed" },
      }),
    ]);
  const totalQueues =
    pendingCount + underReviewCount + resolvedCount + dismissedCount;
  // Helper function for queue statistics
  const buildQueueStatistic = (
    count: number,
    total: number,
  ): IDiscussionBoardContentModerationQueueStatistic => ({
    count: count as number & tags.Type<"int32">,
    percentage: total > 0 ? parseFloat(((count * 100) / total).toFixed(2)) : 0,
  });
  // Calculate processing times using resolved queues
  const resolvedQueues =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findMany({
      where: {
        AND: [{ resolved_at: { not: null } }, { assigned_at: { not: null } }],
      },
      select: {
        moderation_status: true,
        assigned_at: true,
        resolved_at: true,
      },
    });
  // Aggregate processing times by status safely
  const processingData: Record<
    string,
    {
      seconds: number[];
    }
  > = {};
  for (const queue of resolvedQueues) {
    if (queue.assigned_at && queue.resolved_at) {
      const assignedAt = queue.assigned_at;
      const resolvedAt = queue.resolved_at;
      const processingTimeSeconds =
        (resolvedAt.getTime() - assignedAt.getTime()) / 1000;
      if (!processingData[queue.moderation_status]) {
        processingData[queue.moderation_status] = { seconds: [] };
      }
      processingData[queue.moderation_status].seconds.push(
        processingTimeSeconds,
      );
    }
  }
  // Calculate overall average
  const allProcessingTimes = Object.values(processingData).flatMap(
    (data) => data.seconds,
  );
  const overallAverage =
    allProcessingTimes.length > 0
      ? parseFloat(
          (
            allProcessingTimes.reduce((a, b) => a + b, 0) /
            allProcessingTimes.length
          ).toFixed(2),
        )
      : 0;
  // Calculate by status
  const processingTimesByStatus = {} as Record<string, number>;
  for (const [status, data] of Object.entries(processingData)) {
    processingTimesByStatus[status] =
      data.seconds.length > 0
        ? parseFloat(
            (
              data.seconds.reduce((a, b) => a + b, 0) / data.seconds.length
            ).toFixed(2),
          )
        : 0;
  }
  // Get administrator distribution
  const adminAssignments =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.groupBy({
      by: ["assigned_admin_id"],
      where: {
        assigned_admin_id: { not: null },
        resolved_at: { not: null },
      },
      _count: { _all: true },
    });
  // Build administrator distribution with admin details
  const adminDistributionPromises = adminAssignments.map(async (assignment) => {
    if (!assignment.assigned_admin_id) return null;
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: assignment.assigned_admin_id, deleted_at: null },
      select: { id: true, email: true, display_name: true, created_at: true },
    });
    if (!admin) return null;
    // Calculate processing efficiency for this admin
    const adminQueues =
      await MyGlobal.prisma.discussion_board_content_moderation_queues.findMany(
        {
          where: {
            assigned_admin_id: assignment.assigned_admin_id,
            resolved_at: { not: null },
            assigned_at: { not: null },
          },
          select: { assigned_at: true, resolved_at: true },
        },
      );
    const processingTimes = adminQueues
      .filter((q) => q.assigned_at && q.resolved_at)
      .map((q) => (q.resolved_at!.getTime() - q.assigned_at!.getTime()) / 1000);
    const averageTimeSeconds =
      processingTimes.length > 0
        ? parseFloat(
            (
              processingTimes.reduce((a, b) => a + b, 0) /
              processingTimes.length
            ).toFixed(2),
          )
        : 0;
    const efficiencyScore =
      averageTimeSeconds > 0
        ? parseFloat(((1 / averageTimeSeconds) * 1000).toFixed(2))
        : 0;
    return {
      administrator: {
        id: admin.id as string & tags.Format<"uuid">,
        email: admin.email as string & tags.Format<"email">,
        display_name: admin.display_name,
        created_at: toISOStringSafe(admin.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardAdmin.ISummary,
      assignment_count:
        typeof assignment._count === "object" && assignment._count !== null
          ? (assignment._count._all as number & tags.Type<"int32">)
          : (0 as number & tags.Type<"int32">),
      efficiency_score: efficiencyScore,
      average_processing_time_seconds: averageTimeSeconds,
    } satisfies IDiscussionBoardAdministratorDistributionStatistic;
  });
  const administrators = (await Promise.all(adminDistributionPromises)).filter(
    (admin): admin is IDiscussionBoardAdministratorDistributionStatistic =>
      admin !== null,
  );
  // Priority level distribution
  const priorityCounts =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.groupBy({
      by: ["priority_level"],
      _count: { _all: true },
    });
  const priorityLevels = priorityCounts.reduce(
    (acc, item) => {
      acc[item.priority_level] =
        typeof item._count === "object" && item._count !== null
          ? (item._count._all as number & tags.Type<"int32">)
          : (0 as number & tags.Type<"int32">);
      return acc;
    },
    {} as Record<string, number & tags.Type<"int32">>,
  );
  // Escalation analysis - fix: use proper Prisma filter syntax
  const escalationReasons =
    await MyGlobal.prisma.discussion_board_content_moderation_queue_escalations.groupBy(
      {
        by: ["escalation_reason"],
        where: { escalation_reason: { not: null } } as any,
        _count: { _all: true },
      },
    );
  const totalEscalations = escalationReasons.reduce(
    (sum, item) =>
      sum +
      (typeof item._count === "object" && item._count !== null
        ? item._count._all
        : 0),
    0,
  );
  const escalationAnalysis = escalationReasons.map((item) => ({
    reason: item.escalation_reason || "Unknown",
    count:
      typeof item._count === "object" && item._count !== null
        ? (item._count._all as number & tags.Type<"int32">)
        : (0 as number & tags.Type<"int32">),
    percentage:
      totalEscalations > 0
        ? parseFloat(
            (
              ((typeof item._count === "object" && item._count !== null
                ? item._count._all
                : 0) *
                100) /
              totalEscalations
            ).toFixed(2),
          )
        : 0,
  })) satisfies IDiscussionBoardContentModerationQueueEscalation[];
  // Build final analytics object
  return {
    queue_statistics: {
      pending: buildQueueStatistic(pendingCount, totalQueues),
      under_review: buildQueueStatistic(underReviewCount, totalQueues),
      resolved: buildQueueStatistic(resolvedCount, totalQueues),
      dismissed: buildQueueStatistic(dismissedCount, totalQueues),
    },
    processing_times: {
      average_seconds: overallAverage,
      by_status: {
        pending: processingTimesByStatus.pending || 0,
        under_review: processingTimesByStatus.under_review || 0,
        resolved: processingTimesByStatus.resolved || 0,
        dismissed: processingTimesByStatus.dismissed || 0,
      },
    },
    assignment_distribution: {
      administrators: administrators,
      total_assignments: administrators.reduce(
        (sum, admin) => sum + admin.assignment_count,
        0,
      ) as number & tags.Type<"int32">,
    },
    priority_levels: {
      low: priorityLevels.low || (0 as number & tags.Type<"int32">),
      medium: priorityLevels.medium || (0 as number & tags.Type<"int32">),
      high: priorityLevels.high || (0 as number & tags.Type<"int32">),
      critical: priorityLevels.critical || (0 as number & tags.Type<"int32">),
    },
    escalation_analysis: {
      total_escalations: totalEscalations as number & tags.Type<"int32">,
      by_reason: escalationAnalysis,
      average_escalation_time_hours: 0, // Not available from current data
    },
    timestamp,
  } satisfies IDiscussionBoardContentModerationQueueAssignment.IAnalytic;
}
