import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

export async function getTodoAppStatisticsEngagement(): Promise<ITodoAppEngagementStatistics> {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const thirtyDaysAgo = new Date(
    todayStart.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const prevMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const prevMonthEnd = monthStart;

  const [
    totalUsersCount,
    totalAdminsCount,
    deletedUsersCount,
    deletedAdminsCount,
    userCreatedToday,
    userCreatedThisWeek,
    userCreatedThisMonth,
    adminCreatedToday,
    adminCreatedThisWeek,
    adminCreatedThisMonth,
    userActiveTodayCount,
    userActiveThisWeekCount,
    userActiveThisMonthCount,
    adminActiveTodayCount,
    adminActiveThisWeekCount,
    adminActiveThisMonthCount,
    userCreatedLastMonth,
  ] = await Promise.all([
    MyGlobal.prisma.todo_app_user.count({ where: { deleted_at: null } }),
    MyGlobal.prisma.todo_app_admin.count({ where: { deleted_at: null } }),
    MyGlobal.prisma.todo_app_user.count({
      where: { deleted_at: { not: null } },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: { deleted_at: { not: null } },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        created_at: { gte: todayStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: { created_at: { gte: weekStart, lt: todayEnd }, deleted_at: null },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        created_at: { gte: monthStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: {
        created_at: { gte: todayStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: { created_at: { gte: weekStart, lt: todayEnd }, deleted_at: null },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: {
        created_at: { gte: monthStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        last_active_at: { gte: todayStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        last_active_at: { gte: weekStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        last_active_at: { gte: thirtyDaysAgo, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: {
        last_active_at: { gte: todayStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: {
        last_active_at: { gte: weekStart, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_admin.count({
      where: {
        last_active_at: { gte: thirtyDaysAgo, lt: todayEnd },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.todo_app_user.count({
      where: {
        created_at: { gte: prevMonthStart, lt: prevMonthEnd },
        deleted_at: null,
      },
    }),
  ]);

  const userRetentionRate =
    totalUsersCount > 0
      ? (userActiveThisMonthCount / totalUsersCount) * 100
      : 0;
  const adminRetentionRate =
    totalAdminsCount > 0
      ? (adminActiveThisMonthCount / totalAdminsCount) * 100
      : 0;

  const usersWithActivity = await MyGlobal.prisma.todo_app_user.findMany({
    where: { deleted_at: null, last_active_at: { not: null } },
    select: { last_active_at: true },
  });

  const adminsWithActivity = await MyGlobal.prisma.todo_app_admin.findMany({
    where: { deleted_at: null, last_active_at: { not: null } },
    select: { last_active_at: true },
  });

  const calculateAverageDaysSinceActivity = (
    timestamps: (Date | null)[],
  ): number => {
    const validTimestamps = timestamps.filter((ts): ts is Date => ts !== null);
    if (validTimestamps.length === 0) return 0;
    const totalDays = validTimestamps.reduce((sum, ts) => {
      const daysDiff = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysDiff;
    }, 0);
    return totalDays / validTimestamps.length;
  };

  const avgDaysSinceUserActivity = calculateAverageDaysSinceActivity(
    usersWithActivity.map((u) => u.last_active_at),
  );
  const avgDaysSinceAdminActivity = calculateAverageDaysSinceActivity(
    adminsWithActivity.map((a) => a.last_active_at),
  );

  const usersActivePreviousMonth = await MyGlobal.prisma.todo_app_user.count({
    where: {
      last_active_at: { gte: prevMonthStart, lt: prevMonthEnd },
      deleted_at: null,
    },
  });

  const userChurnRate =
    usersActivePreviousMonth > 0
      ? ((usersActivePreviousMonth - userActiveThisMonthCount) /
          usersActivePreviousMonth) *
        100
      : 0;

  const accelerationRatio =
    userCreatedLastMonth > 0
      ? userCreatedThisMonth / userCreatedLastMonth
      : userCreatedThisMonth > 0
        ? 1.0
        : 1.0;

  const computedAt = toISOStringSafe(now);
  const periodStart = toISOStringSafe(monthStart);
  const periodEnd = toISOStringSafe(now);

  return {
    total_users_count: totalUsersCount,
    total_admins_count: totalAdminsCount,
    deleted_users_count: deletedUsersCount,
    deleted_admins_count: deletedAdminsCount,
    users_created_today: userCreatedToday,
    users_created_this_week: userCreatedThisWeek,
    users_created_this_month: userCreatedThisMonth,
    admins_created_today: adminCreatedToday,
    admins_created_this_week: adminCreatedThisWeek,
    admins_created_this_month: adminCreatedThisMonth,
    users_active_today: userActiveTodayCount,
    users_active_this_week: userActiveThisWeekCount,
    users_active_this_month: userActiveThisMonthCount,
    admins_active_today: adminActiveTodayCount,
    admins_active_this_week: adminActiveThisWeekCount,
    admins_active_this_month: adminActiveThisMonthCount,
    average_days_since_user_activity: avgDaysSinceUserActivity,
    average_days_since_admin_activity: avgDaysSinceAdminActivity,
    user_retention_rate_30_days: userRetentionRate,
    admin_retention_rate_30_days: adminRetentionRate,
    user_churn_rate: userChurnRate,
    account_creation_acceleration_ratio: accelerationRatio,
    statistics_computed_at: computedAt,
    data_period_start: periodStart,
    data_period_end: periodEnd,
  };
}
