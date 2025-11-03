import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationStatistics";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationDashboardStatistics(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationStatistics> {
  const nowTimestamp = new Date().getTime();
  const last24HoursTimestamp = new Date(nowTimestamp - 24 * 60 * 60 * 1000);
  const last7DaysTimestamp = new Date(nowTimestamp - 7 * 24 * 60 * 60 * 1000);
  const last30DaysTimestamp = new Date(nowTimestamp - 30 * 24 * 60 * 60 * 1000);

  const [
    pendingReports,
    underReviewReports,
    resolvedLast24h,
    activeSuspensions,
    warningsLastWeek,
    allResolvedReports,
    totalReportsAllTime,
    reportsLast24h,
    reportsLastWeek,
    reportsLastMonth,
    reportsByViolation,
    reportStatusCounts,
    multipleReportedArticles,
    totalActionsAllTime,
    actionsLast24h,
    actionsLastWeek,
    actionsLastMonth,
    actionsByType,
    actionsByTarget,
  ] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.count({
      where: { status: "pending" },
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where: { status: "under_review" },
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where: {
        status: { in: ["resolved", "dismissed"] },
        updated_at: { gte: last24HoursTimestamp },
      },
    }),
    MyGlobal.prisma.discussion_board_user_suspensions.count({
      where: {
        lifted_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gte: new Date(nowTimestamp) } },
        ],
      },
    }),
    MyGlobal.prisma.discussion_board_user_warnings.count({
      where: {
        created_at: { gte: last7DaysTimestamp },
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_reports.findMany({
      where: {
        status: { in: ["resolved", "dismissed"] },
        updated_at: { gte: last30DaysTimestamp },
      },
      select: {
        created_at: true,
        updated_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.discussion_board_reports.count(),
    MyGlobal.prisma.discussion_board_reports.count({
      where: { created_at: { gte: last24HoursTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where: { created_at: { gte: last7DaysTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where: { created_at: { gte: last30DaysTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["report_reason"],
      _count: { id: true },
    }),
    Promise.all([
      MyGlobal.prisma.discussion_board_reports.count({
        where: { status: "pending" },
      }),
      MyGlobal.prisma.discussion_board_reports.count({
        where: { status: "under_review" },
      }),
      MyGlobal.prisma.discussion_board_reports.count({
        where: { status: "resolved" },
      }),
      MyGlobal.prisma.discussion_board_reports.count({
        where: { status: "dismissed" },
      }),
    ]),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["reported_article_id"],
      where: { reported_article_id: { not: null } },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count(),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: { created_at: { gte: last24HoursTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: { created_at: { gte: last7DaysTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: { created_at: { gte: last30DaysTimestamp } },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.groupBy({
      by: ["action_type"],
      _count: { id: true },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.groupBy({
      by: ["target_type"],
      _count: { id: true },
    }),
  ]);

  const resolutionTimes = allResolvedReports.map(
    (r) => r.updated_at.getTime() - r.created_at.getTime(),
  );
  const averageResolutionTimeMs =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) /
        resolutionTimes.length
      : 0;
  const averageResolutionTimeHours = averageResolutionTimeMs / (1000 * 60 * 60);

  const reportsWithAction = allResolvedReports.filter(
    (r) => r.status === "resolved",
  ).length;
  const reportAccuracyPercentage =
    allResolvedReports.length > 0
      ? (reportsWithAction / allResolvedReports.length) * 100
      : 0;

  const totalReports = totalReportsAllTime;
  const violationTypeCounts: IDiscussionBoardModerationStatistics.IViolationTypeCount[] =
    reportsByViolation.map((v) => ({
      violationType: v.report_reason,
      count: v._count.id,
      percentage: totalReports > 0 ? (v._count.id / totalReports) * 100 : 0,
    }));

  const reportsByStatus: IDiscussionBoardModerationStatistics.IReportStatusBreakdown =
    {
      pending: reportStatusCounts[0],
      underReview: reportStatusCounts[1],
      resolved: reportStatusCounts[2],
      dismissed: reportStatusCounts[3],
    };

  const totalActions = totalActionsAllTime;
  const actionTypeCounts: IDiscussionBoardModerationStatistics.IActionTypeCount[] =
    actionsByType.map((a) => ({
      actionType: a.action_type,
      count: a._count.id,
      percentage: totalActions > 0 ? (a._count.id / totalActions) * 100 : 0,
    }));

  const targetTypeCounts: IDiscussionBoardModerationStatistics.ITargetTypeCount[] =
    actionsByTarget.map((t) => ({
      targetType: t.target_type,
      count: t._count.id,
      percentage: totalActions > 0 ? (t._count.id / totalActions) * 100 : 0,
    }));

  const activeModerators =
    await MyGlobal.prisma.discussion_board_moderation_actions.groupBy({
      by: ["discussion_board_moderator_id"],
      where: { created_at: { gte: last30DaysTimestamp } },
      _count: { id: true },
    });

  const totalActiveModerators = activeModerators.length;
  const averageReportsPerModerator =
    totalActiveModerators > 0
      ? allResolvedReports.length / totalActiveModerators
      : 0;
  const averageActionsPerModerator =
    totalActiveModerators > 0 ? actionsLastMonth / totalActiveModerators : 0;

  const moderatorActivityData = await Promise.all(
    activeModerators.slice(0, 50).map(async (mod) => {
      const [moderatorInfo, reportsReviewed, moderatorResolvedReports] =
        await Promise.all([
          MyGlobal.prisma.discussion_board_moderators.findUnique({
            where: { id: mod.discussion_board_moderator_id },
          }),
          MyGlobal.prisma.discussion_board_reports.count({
            where: {
              reviewing_moderator_id: mod.discussion_board_moderator_id,
              status: { in: ["resolved", "dismissed"] },
              updated_at: { gte: last30DaysTimestamp },
            },
          }),
          MyGlobal.prisma.discussion_board_reports.findMany({
            where: {
              reviewing_moderator_id: mod.discussion_board_moderator_id,
              status: { in: ["resolved", "dismissed"] },
              updated_at: { gte: last30DaysTimestamp },
            },
            select: {
              created_at: true,
              updated_at: true,
            },
          }),
        ]);

      const modResolutionTimes = moderatorResolvedReports.map(
        (r) => r.updated_at.getTime() - r.created_at.getTime(),
      );
      const avgResolutionMs =
        modResolutionTimes.length > 0
          ? modResolutionTimes.reduce((sum, time) => sum + time, 0) /
            modResolutionTimes.length
          : 0;

      return {
        moderator: {
          id: (moderatorInfo?.id ?? v4()) as string & tags.Format<"uuid">,
          username: moderatorInfo?.username ?? "",
          display_name: moderatorInfo?.display_name ?? null,
          profile_picture_url: moderatorInfo?.profile_picture_url
            ? (moderatorInfo.profile_picture_url as string & tags.Format<"uri">)
            : null,
          email_verified: moderatorInfo?.email_verified ?? false,
          status: moderatorInfo?.status ?? "",
          moderation_permissions: moderatorInfo?.moderation_permissions ?? "{}",
          profile_visibility: moderatorInfo?.profile_visibility ?? "private",
          activity_visibility: moderatorInfo?.activity_visibility ?? "hidden",
          bio: moderatorInfo?.bio ?? null,
          location: moderatorInfo?.location ?? null,
          website_url: moderatorInfo?.website_url
            ? (moderatorInfo.website_url as string & tags.Format<"uri">)
            : null,
          last_login_at: moderatorInfo?.last_login_at
            ? toISOStringSafe(moderatorInfo.last_login_at)
            : null,
          created_at: moderatorInfo?.created_at
            ? toISOStringSafe(moderatorInfo.created_at)
            : toISOStringSafe(new Date()),
          updated_at: moderatorInfo?.updated_at
            ? toISOStringSafe(moderatorInfo.updated_at)
            : toISOStringSafe(new Date()),
          deleted_at: moderatorInfo?.deleted_at
            ? toISOStringSafe(moderatorInfo.deleted_at)
            : null,
        },
        reportsReviewed: reportsReviewed,
        actionsTaken: mod._count.id,
        averageReviewTimeHours: avgResolutionMs / (1000 * 60 * 60),
      };
    }),
  );

  const [
    totalUsersWarned,
    totalUsersSuspended,
    warnedUserIds,
    suspendedUserIds,
  ] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_warnings.groupBy({
      by: ["discussion_board_member_id"],
      where: { deleted_at: null },
      _count: { id: true },
    }),
    MyGlobal.prisma.discussion_board_user_suspensions.groupBy({
      by: ["discussion_board_member_id"],
      _count: { id: true },
    }),
    MyGlobal.prisma.discussion_board_user_warnings.findMany({
      where: { deleted_at: null },
      select: {
        discussion_board_member_id: true,
        created_at: true,
      },
      orderBy: { created_at: "asc" },
    }),
    MyGlobal.prisma.discussion_board_user_suspensions.findMany({
      select: {
        discussion_board_member_id: true,
        expires_at: true,
      },
    }),
  ]);

  const uniqueWarnedUsers = totalUsersWarned.length;
  const uniqueSuspendedUsers = totalUsersSuspended.length;
  const repeatOffenders = totalUsersWarned.filter(
    (u) => u._count.id > 1,
  ).length;
  const totalUniqueViolators = uniqueWarnedUsers + uniqueSuspendedUsers;
  const repeatOffenderRate =
    totalUniqueViolators > 0
      ? (repeatOffenders / totalUniqueViolators) * 100
      : 0;

  const violationsByUser = new Map<string, number[]>();
  warnedUserIds.forEach((w) => {
    const userId = w.discussion_board_member_id;
    const existing = violationsByUser.get(userId) ?? [];
    existing.push(w.created_at.getTime());
    violationsByUser.set(userId, existing);
  });

  let totalDaysBetweenViolations = 0;
  let violationGapCount = 0;
  violationsByUser.forEach((timestamps) => {
    if (timestamps.length > 1) {
      const sorted = [...timestamps].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        const daysDiff = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
        totalDaysBetweenViolations += daysDiff;
        violationGapCount++;
      }
    }
  });
  const averageDaysBetweenViolations =
    violationGapCount > 0 ? totalDaysBetweenViolations / violationGapCount : 0;

  const permanentBans = suspendedUserIds.filter(
    (s) => s.expires_at === null,
  ).length;
  const warningToBanConversionRate =
    uniqueWarnedUsers > 0 ? (permanentBans / uniqueWarnedUsers) * 100 : 0;

  const [
    totalArticles,
    totalComments,
    reportedArticles,
    reportedComments,
    moderatedContent,
    deletedArticles,
    deletedComments,
  ] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.count({
      where: { deleted_at: null, status: "published" },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["reported_article_id"],
      where: { reported_article_id: { not: null } },
    }),
    MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["reported_comment_id"],
      where: { reported_comment_id: { not: null } },
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: {
        action_type: { in: ["edit_content", "delete_content"] },
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: { deleted_at: { not: null } },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: { not: null } },
    }),
  ]);

  const reportedArticlesPercentage =
    totalArticles > 0 ? (reportedArticles.length / totalArticles) * 100 : 0;
  const reportedCommentsPercentage =
    totalComments > 0 ? (reportedComments.length / totalComments) * 100 : 0;

  const totalContent = totalArticles + totalComments;
  const moderationInterventionRate =
    totalContent > 0 ? (moderatedContent / totalContent) * 100 : 0;

  const totalEverCreated =
    totalArticles + totalComments + deletedArticles + deletedComments;
  const deletedContentPercentage =
    totalEverCreated > 0
      ? ((deletedArticles + deletedComments) / totalEverCreated) * 100
      : 0;

  const currentTime = new Date();

  const hourlyBoundaries = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(
      currentTime.getTime() - (23 - i) * 60 * 60 * 1000,
    );
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    return { start: hourStart, end: hourEnd };
  });

  const dailyBoundaries = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(
      currentTime.getTime() - (6 - i) * 24 * 60 * 60 * 1000,
    );
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return { start: dayStart, end: dayEnd };
  });

  const weeklyBoundaries = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(
      currentTime.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000,
    );
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start: weekStart, end: weekEnd };
  });

  const monthlyBoundaries = Array.from({ length: 12 }, (_, i) => {
    const monthStart = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth() - (11 - i),
      1,
    );
    const monthEnd = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth() - (11 - i) + 1,
      1,
    );
    return { start: monthStart, end: monthEnd };
  });

  const [
    hourlyReportCounts,
    dailyReportCounts,
    dailyActionCounts,
    weeklyReportCounts,
    monthlyActionCounts,
  ] = await Promise.all([
    Promise.all(
      hourlyBoundaries.map((bounds) =>
        MyGlobal.prisma.discussion_board_reports.count({
          where: {
            created_at: { gte: bounds.start, lt: bounds.end },
          },
        }),
      ),
    ),
    Promise.all(
      dailyBoundaries.map((bounds) =>
        MyGlobal.prisma.discussion_board_reports.count({
          where: {
            created_at: { gte: bounds.start, lt: bounds.end },
          },
        }),
      ),
    ),
    Promise.all(
      dailyBoundaries.map((bounds) =>
        MyGlobal.prisma.discussion_board_moderation_actions.count({
          where: {
            created_at: { gte: bounds.start, lt: bounds.end },
          },
        }),
      ),
    ),
    Promise.all(
      weeklyBoundaries.map((bounds) =>
        MyGlobal.prisma.discussion_board_reports.count({
          where: {
            created_at: { gte: bounds.start, lt: bounds.end },
          },
        }),
      ),
    ),
    Promise.all(
      monthlyBoundaries.map((bounds) =>
        MyGlobal.prisma.discussion_board_moderation_actions.count({
          where: {
            created_at: { gte: bounds.start, lt: bounds.end },
          },
        }),
      ),
    ),
  ]);

  const hourlyReports: IDiscussionBoardModerationStatistics.IHourlyDataPoint[] =
    hourlyBoundaries.map((bounds, index) => ({
      hour: toISOStringSafe(bounds.start),
      count: hourlyReportCounts[index],
    }));

  const dailyReports: IDiscussionBoardModerationStatistics.IDailyDataPoint[] =
    dailyBoundaries.map((bounds, index) => {
      const dateStr = toISOStringSafe(bounds.start).split("T")[0];
      return {
        date: dateStr as string & tags.Format<"date">,
        count: dailyReportCounts[index],
      };
    });

  const dailyActions: IDiscussionBoardModerationStatistics.IDailyDataPoint[] =
    dailyBoundaries.map((bounds, index) => {
      const dateStr = toISOStringSafe(bounds.start).split("T")[0];
      return {
        date: dateStr as string & tags.Format<"date">,
        count: dailyActionCounts[index],
      };
    });

  const weeklyReports: IDiscussionBoardModerationStatistics.IWeeklyDataPoint[] =
    weeklyBoundaries.map((bounds, index) => {
      const weekDateStr = toISOStringSafe(bounds.start).split("T")[0];
      return {
        weekStartDate: weekDateStr as string & tags.Format<"date">,
        count: weeklyReportCounts[index],
      };
    });

  const monthlyActions: IDiscussionBoardModerationStatistics.IMonthlyDataPoint[] =
    monthlyBoundaries.map((bounds, index) => {
      const monthDateStr = toISOStringSafe(bounds.start).split("T")[0];
      return {
        month: monthDateStr as string & tags.Format<"date">,
        count: monthlyActionCounts[index],
      };
    });

  return {
    overview: {
      pendingReportsCount: pendingReports,
      underReviewReportsCount: underReviewReports,
      resolvedReportsLast24Hours: resolvedLast24h,
      activeSuspensionsCount: activeSuspensions,
      warningsIssuedLastWeek: warningsLastWeek,
      averageReportResolutionTimeHours: averageResolutionTimeHours,
      reportAccuracyPercentage: reportAccuracyPercentage,
    },
    reportMetrics: {
      totalReportsAllTime: totalReportsAllTime,
      reportsLast24Hours: reportsLast24h,
      reportsLastWeek: reportsLastWeek,
      reportsLastMonth: reportsLastMonth,
      averageResolutionTimeHours: averageResolutionTimeHours,
      reportsByViolationType: violationTypeCounts,
      reportsByStatus: reportsByStatus,
      reportAccuracyRate: reportAccuracyPercentage,
      multipleReportedContentCount: multipleReportedArticles.length,
    },
    moderationActionMetrics: {
      totalActionsAllTime: totalActionsAllTime,
      actionsLast24Hours: actionsLast24h,
      actionsLastWeek: actionsLastWeek,
      actionsLastMonth: actionsLastMonth,
      actionsByType: actionTypeCounts,
      actionsByTargetType: targetTypeCounts,
    },
    moderatorWorkload: {
      totalActiveModerators: totalActiveModerators,
      averageReportsPerModerator: averageReportsPerModerator,
      averageActionsPerModerator: averageActionsPerModerator,
      moderatorActivity: moderatorActivityData,
    },
    userBehaviorMetrics: {
      totalUsersWarned: uniqueWarnedUsers,
      totalUsersSuspended: uniqueSuspendedUsers,
      repeatOffendersCount: repeatOffenders,
      repeatOffenderRate: repeatOffenderRate,
      averageDaysBetweenViolations: averageDaysBetweenViolations,
      warningToBanConversionRate: warningToBanConversionRate,
    },
    contentHealthMetrics: {
      totalArticlesCount: totalArticles,
      totalCommentsCount: totalComments,
      reportedArticlesPercentage: reportedArticlesPercentage,
      reportedCommentsPercentage: reportedCommentsPercentage,
      moderationInterventionRate: moderationInterventionRate,
      deletedContentPercentage: deletedContentPercentage,
    },
    temporalTrends: {
      hourlyReportsLast24Hours: hourlyReports,
      dailyReportsLastWeek: dailyReports,
      weeklyReportsLastMonth: weeklyReports,
      dailyActionsLastWeek: dailyActions,
      monthlyActionsLastYear: monthlyActions,
    },
  };
}
