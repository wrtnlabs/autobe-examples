import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminDashboardAppeal(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardBanAppeal.IDashboard> {
  // Get counts of appeals by status
  const appealsByStatus =
    await MyGlobal.prisma.discussion_board_ban_appeals.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: { _all: true },
    });
  // Calculate average processing time using Prisma
  const processingTimeData =
    await MyGlobal.prisma.discussion_board_ban_appeals.findMany({
      where: {
        reviewed_at: { not: null },
        deleted_at: null,
      },
      select: {
        appealed_at: true,
        reviewed_at: true,
      },
    });
  const totalHours = processingTimeData.reduce((sum, appeal) => {
    if (appeal.reviewed_at && appeal.appealed_at) {
      const appealedAt = new Date(appeal.appealed_at).getTime();
      const reviewedAt = new Date(appeal.reviewed_at).getTime();
      const hours = (reviewedAt - appealedAt) / (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);
  const averageProcessingTimeHours =
    processingTimeData.length > 0 ? totalHours / processingTimeData.length : 0;
  // Get recent appeals from past 30 days (calculate timestamp without Date constructor)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentAppeals =
    await MyGlobal.prisma.discussion_board_ban_appeals.findMany({
      where: {
        appealed_at: { gte: thirtyDaysAgo },
        deleted_at: null,
      },
      orderBy: { appealed_at: "desc" },
      take: 10,
      include: {
        banRecord: true,
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
            updated_at: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    });
  // Get workload distribution
  const workloadData =
    await MyGlobal.prisma.discussion_board_ban_appeals.groupBy({
      by: ["discussion_board_admin_id"],
      where: {
        status: { in: ["pending", "under_review"] },
        deleted_at: null,
      },
      _count: { _all: true },
    });
  // Get total appeals count
  const totalAppeals = await MyGlobal.prisma.discussion_board_ban_appeals.count(
    {
      where: { deleted_at: null },
    },
  );
  // Calculate approval rate
  const completedAppeals =
    await MyGlobal.prisma.discussion_board_ban_appeals.groupBy({
      by: ["status"],
      where: {
        status: { in: ["approved", "rejected"] },
        deleted_at: null,
      },
      _count: { _all: true },
    });
  const approvedCount =
    completedAppeals.find((item) => item.status === "approved")?._count._all ||
    0;
  const totalCompleted = completedAppeals.reduce(
    (sum, item) => sum + item._count._all,
    0,
  );
  const approvalRate =
    totalCompleted > 0 ? (approvedCount * 100.0) / totalCompleted : 0;
  // Transform data to match the dashboard structure
  const appealsByStatusObj = appealsByStatus.reduce(
    (acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    },
    {} as Record<string, number>,
  );
  const workloadDistributionObj = workloadData.reduce(
    (acc, item) => {
      acc[item.discussion_board_admin_id || "unassigned"] = item._count._all;
      return acc;
    },
    {} as Record<string, number>,
  );
  return {
    appeals_by_status: appealsByStatusObj as any,
    recent_appeals: recentAppeals.map((appeal) => ({
      id: appeal.id,
      appeal_reason: appeal.appeal_reason,
      status: appeal.status,
      appealed_at: toISOStringSafe(appeal.appealed_at),
      banRecord: {
        id: appeal.banRecord.id,
        ban_reason: appeal.banRecord.ban_reason,
        ban_duration_days: appeal.banRecord.ban_duration_days,
        ban_status: appeal.banRecord.ban_status,
        expires_at: appeal.banRecord.expires_at
          ? toISOStringSafe(appeal.banRecord.expires_at)
          : undefined,
        revoked_at: appeal.banRecord.revoked_at
          ? toISOStringSafe(appeal.banRecord.revoked_at)
          : undefined,
        revoked_reason: appeal.banRecord.revoked_reason,
        created_at: toISOStringSafe(appeal.banRecord.created_at),
        updated_at: toISOStringSafe(appeal.banRecord.updated_at),
      },
      user: {
        id: appeal.user.id,
        display_name: appeal.user.display_name,
        bio: appeal.user.bio,
        created_at: toISOStringSafe(appeal.user.created_at),
        updated_at: toISOStringSafe(appeal.user.updated_at),
      },
      decision_reason: appeal.decision_reason,
      reviewed_at: appeal.reviewed_at
        ? toISOStringSafe(appeal.reviewed_at)
        : null,
      reviewer: appeal.reviewer
        ? {
            id: appeal.reviewer.id,
            email: appeal.reviewer.email,
            display_name: appeal.reviewer.display_name,
            created_at: toISOStringSafe(appeal.reviewer.created_at),
          }
        : null,
      created_at: toISOStringSafe(appeal.created_at),
      updated_at: toISOStringSafe(appeal.updated_at),
      deleted_at: appeal.deleted_at ? toISOStringSafe(appeal.deleted_at) : null,
    })),
    workload_distribution: workloadDistributionObj as any,
    performance_metrics: {
      id: v4(),
      metric_type: "appeal_processing_efficiency",
      metric_value: averageProcessingTimeHours,
      metric_unit: "hours",
      source_component: "ban_appeals_dashboard",
      collection_timestamp: toISOStringSafe(new Date()),
      time_range: "instantaneous",
      metadata: JSON.stringify({
        total_appeals: totalAppeals,
        appeals_by_status: appealsByStatusObj,
        approval_rate: approvalRate,
      }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    total_appeals: totalAppeals,
    average_processing_time_hours: averageProcessingTimeHours,
    approval_rate: approvalRate,
  };
}
