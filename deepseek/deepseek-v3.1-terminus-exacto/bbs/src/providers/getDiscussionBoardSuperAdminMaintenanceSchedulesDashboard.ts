import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
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

export async function getDiscussionBoardSuperAdminMaintenanceSchedulesDashboard(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardMaintenanceSchedule.IDashboard> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Count upcoming maintenance
  const upcomingMaintenanceCount =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: {
        status: "scheduled",
        scheduled_start_time: { gt: now },
        deleted_at: null,
      },
    });
  // Count completed maintenance in last 30 days
  const completedMaintenanceCount =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: {
        status: "completed",
        actual_end_time: { gte: thirtyDaysAgo },
        deleted_at: null,
      },
    });
  // Count total maintenance for completion rate
  const totalMaintenanceCount =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.count({
      where: {
        status: { in: ["scheduled", "completed", "cancelled"] },
        created_at: { gte: thirtyDaysAgo },
        deleted_at: null,
      },
    });
  // Calculate completion rate
  const completionRate =
    totalMaintenanceCount > 0
      ? (completedMaintenanceCount / totalMaintenanceCount) * 100
      : 0;
  // Get duration differences for completed maintenance
  const durationResults =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: {
        status: "completed",
        actual_duration_minutes: { not: null },
        deleted_at: null,
      },
      select: {
        actual_duration_minutes: true,
        estimated_duration_minutes: true,
      },
    });
  const averageDurationDifference =
    durationResults.length > 0
      ? durationResults.reduce((sum, result) => {
          const diff =
            (result.actual_duration_minutes || 0) -
            result.estimated_duration_minutes;
          return sum + diff;
        }, 0) / durationResults.length
      : 0;
  // Maintenance type breakdown
  const maintenanceTypeBreakdown =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.groupBy({
      by: ["maintenance_type"],
      where: { deleted_at: null },
      _count: { _all: true },
    });
  // Impact level breakdown
  const impactLevelBreakdown =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.groupBy({
      by: ["impact_level"],
      where: { deleted_at: null },
      _count: { _all: true },
    });
  // Recent maintenance activity
  const recentMaintenance =
    await MyGlobal.prisma.discussion_board_maintenance_schedules.findMany({
      where: {
        status: "completed",
        deleted_at: null,
      },
      include: {
        scheduledByAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        performedByAdmin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
      orderBy: { actual_end_time: "desc" },
      take: 5,
    });
  // Transform to match DTO structure
  return {
    upcoming_maintenance_count: upcomingMaintenanceCount,
    completed_maintenance_count: completedMaintenanceCount,
    completion_rate: completionRate,
    average_duration_difference: averageDurationDifference,
    maintenance_type_breakdown: maintenanceTypeBreakdown.map((item) => ({
      maintenance_type: item.maintenance_type,
      count: item._count._all,
    })),
    impact_level_breakdown: impactLevelBreakdown.map((item) => ({
      impact_level: item.impact_level,
      count: item._count._all,
    })),
    recent_maintenance_activity: recentMaintenance.map((activity) => ({
      scheduled_end_time: toISOStringSafe(activity.scheduled_end_time),
      estimated_duration_minutes: activity.estimated_duration_minutes,
      actual_duration_minutes:
        activity.actual_duration_minutes !== null
          ? activity.actual_duration_minutes
          : undefined,
      notes: activity.notes !== null ? activity.notes : undefined,
      created_at: toISOStringSafe(activity.created_at),
      updated_at: toISOStringSafe(activity.updated_at),
      scheduled_by_admin: {
        id: activity.scheduledByAdmin.id,
        email: activity.scheduledByAdmin.email,
        display_name: activity.scheduledByAdmin.display_name,
        created_at: toISOStringSafe(activity.scheduledByAdmin.created_at),
      },
      performed_by_admin: activity.performedByAdmin
        ? {
            id: activity.performedByAdmin.id,
            email: activity.performedByAdmin.email,
            display_name: activity.performedByAdmin.display_name,
            created_at: toISOStringSafe(activity.performedByAdmin.created_at),
          }
        : undefined,
      maintenance_type: activity.maintenance_type,
      description: activity.description,
      scheduled_start_time: toISOStringSafe(activity.scheduled_start_time),
      actual_start_time: activity.actual_start_time
        ? toISOStringSafe(activity.actual_start_time)
        : undefined,
      actual_end_time: activity.actual_end_time
        ? toISOStringSafe(activity.actual_end_time)
        : undefined,
      status: activity.status,
      impact_level: activity.impact_level,
    })),
  };
}
