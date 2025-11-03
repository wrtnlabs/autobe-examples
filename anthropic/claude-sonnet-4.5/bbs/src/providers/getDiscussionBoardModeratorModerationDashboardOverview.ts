import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationDashboardOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboardOverview";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import { IDiscussionBoardModerationDashboardStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboardStatistics";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationDashboardOverview(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationDashboardOverview> {
  const now = toISOStringSafe(new Date());
  const twentyFourHoursAgo = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  const pendingReports =
    await MyGlobal.prisma.discussion_board_reports.findMany({
      where: {
        status: "pending",
        deleted_at: null,
      },
      include: {
        reporter: true,
        reviewingModerator: true,
      },
      orderBy: { created_at: "desc" },
    });

  const underReviewReports =
    await MyGlobal.prisma.discussion_board_reports.findMany({
      where: {
        status: "under_review",
        deleted_at: null,
      },
      include: {
        reporter: true,
        reviewingModerator: true,
      },
      orderBy: { created_at: "desc" },
    });

  const recentModerationActions =
    await MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: {
        created_at: {
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        moderator: true,
      },
      orderBy: { created_at: "desc" },
    });

  const activeSuspensions =
    await MyGlobal.prisma.discussion_board_user_suspensions.findMany({
      where: {
        suspended_at: {
          lte: now,
        },
        lifted_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
      include: {
        suspendedUser: true,
        suspendingModerator: true,
        liftingModerator: true,
      },
      orderBy: { suspended_at: "desc" },
    });

  const pendingReportsCount =
    await MyGlobal.prisma.discussion_board_reports.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });

  const underReviewReportsCount =
    await MyGlobal.prisma.discussion_board_reports.count({
      where: {
        status: "under_review",
        deleted_at: null,
      },
    });

  const resolvedReportsCount24h =
    await MyGlobal.prisma.discussion_board_reports.count({
      where: {
        status: {
          in: ["resolved", "dismissed"],
        },
        updated_at: {
          gte: twentyFourHoursAgo,
        },
      },
    });

  const activeSuspensionsCount =
    await MyGlobal.prisma.discussion_board_user_suspensions.count({
      where: {
        suspended_at: {
          lte: now,
        },
        lifted_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
    });

  const warningsIssuedCount7d =
    await MyGlobal.prisma.discussion_board_user_warnings.count({
      where: {
        created_at: {
          gte: sevenDaysAgo,
        },
        deleted_at: null,
      },
    });

  const totalModerationActionsCount24h =
    await MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: {
        created_at: {
          gte: twentyFourHoursAgo,
        },
      },
    });

  const urgentReportsCount = 0;

  const resolvedReportsLast7Days =
    await MyGlobal.prisma.discussion_board_reports.findMany({
      where: {
        status: {
          in: ["resolved", "dismissed"],
        },
        updated_at: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        created_at: true,
        updated_at: true,
      },
    });

  let averageReportResolutionTimeHours: number | null | undefined = undefined;
  if (resolvedReportsLast7Days.length > 0) {
    const totalHours = resolvedReportsLast7Days.reduce((sum, report) => {
      const createdMs = new Date(report.created_at).getTime();
      const updatedMs = new Date(report.updated_at).getTime();
      const hours = (updatedMs - createdMs) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    averageReportResolutionTimeHours =
      totalHours / resolvedReportsLast7Days.length;
  }

  const pending_reports: IDiscussionBoardReport.ISummary[] = pendingReports.map(
    (report) => ({
      id: report.id as string & tags.Format<"uuid">,
      reporter: {
        id: report.reporter.id as string & tags.Format<"uuid">,
        username: report.reporter.username,
        display_name: report.reporter.display_name ?? null,
        profile_picture_url: report.reporter.profile_picture_url
          ? (report.reporter.profile_picture_url as string & tags.Format<"uri">)
          : null,
      },
      reported_article_id: report.reported_article_id
        ? (report.reported_article_id as string & tags.Format<"uuid">)
        : null,
      reported_comment_id: report.reported_comment_id
        ? (report.reported_comment_id as string & tags.Format<"uuid">)
        : null,
      reported_content_type: (report.reported_article_id
        ? "article"
        : "comment") as "article" | "comment",
      report_reason: report.report_reason,
      report_details: report.report_details,
      status: report.status as
        | "pending"
        | "under_review"
        | "resolved"
        | "dismissed",
      resolution_notes: report.resolution_notes,
      reviewing_moderator: report.reviewingModerator
        ? {
            id: report.reviewingModerator.id as string & tags.Format<"uuid">,
            username: report.reviewingModerator.username,
            display_name: report.reviewingModerator.display_name,
            profile_picture_url: report.reviewingModerator.profile_picture_url
              ? (report.reviewingModerator.profile_picture_url as string &
                  tags.Format<"uri">)
              : null,
            email_verified: report.reviewingModerator.email_verified,
            status: report.reviewingModerator.status,
            moderation_permissions:
              report.reviewingModerator.moderation_permissions,
            profile_visibility: report.reviewingModerator.profile_visibility,
            activity_visibility: report.reviewingModerator.activity_visibility,
            bio: report.reviewingModerator.bio ?? null,
            location: report.reviewingModerator.location ?? null,
            website_url: report.reviewingModerator.website_url
              ? (report.reviewingModerator.website_url as string &
                  tags.Format<"uri">)
              : null,
            last_login_at: report.reviewingModerator.last_login_at
              ? toISOStringSafe(report.reviewingModerator.last_login_at)
              : null,
            created_at: toISOStringSafe(report.reviewingModerator.created_at),
            updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
            deleted_at: report.reviewingModerator.deleted_at
              ? toISOStringSafe(report.reviewingModerator.deleted_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    }),
  );

  const under_review_reports: IDiscussionBoardReport.ISummary[] =
    underReviewReports.map((report) => ({
      id: report.id as string & tags.Format<"uuid">,
      reporter: {
        id: report.reporter.id as string & tags.Format<"uuid">,
        username: report.reporter.username,
        display_name: report.reporter.display_name ?? null,
        profile_picture_url: report.reporter.profile_picture_url
          ? (report.reporter.profile_picture_url as string & tags.Format<"uri">)
          : null,
      },
      reported_article_id: report.reported_article_id
        ? (report.reported_article_id as string & tags.Format<"uuid">)
        : null,
      reported_comment_id: report.reported_comment_id
        ? (report.reported_comment_id as string & tags.Format<"uuid">)
        : null,
      reported_content_type: (report.reported_article_id
        ? "article"
        : "comment") as "article" | "comment",
      report_reason: report.report_reason,
      report_details: report.report_details,
      status: report.status as
        | "pending"
        | "under_review"
        | "resolved"
        | "dismissed",
      resolution_notes: report.resolution_notes,
      reviewing_moderator: report.reviewingModerator
        ? {
            id: report.reviewingModerator.id as string & tags.Format<"uuid">,
            username: report.reviewingModerator.username,
            display_name: report.reviewingModerator.display_name,
            profile_picture_url: report.reviewingModerator.profile_picture_url
              ? (report.reviewingModerator.profile_picture_url as string &
                  tags.Format<"uri">)
              : null,
            email_verified: report.reviewingModerator.email_verified,
            status: report.reviewingModerator.status,
            moderation_permissions:
              report.reviewingModerator.moderation_permissions,
            profile_visibility: report.reviewingModerator.profile_visibility,
            activity_visibility: report.reviewingModerator.activity_visibility,
            bio: report.reviewingModerator.bio ?? null,
            location: report.reviewingModerator.location ?? null,
            website_url: report.reviewingModerator.website_url
              ? (report.reviewingModerator.website_url as string &
                  tags.Format<"uri">)
              : null,
            last_login_at: report.reviewingModerator.last_login_at
              ? toISOStringSafe(report.reviewingModerator.last_login_at)
              : null,
            created_at: toISOStringSafe(report.reviewingModerator.created_at),
            updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
            deleted_at: report.reviewingModerator.deleted_at
              ? toISOStringSafe(report.reviewingModerator.deleted_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    }));

  const recent_moderation_actions: IDiscussionBoardModerationAction.ISummary[] =
    recentModerationActions.map((action) => ({
      id: action.id as string & tags.Format<"uuid">,
      moderator: {
        id: action.moderator.id as string & tags.Format<"uuid">,
        username: action.moderator.username,
        display_name: action.moderator.display_name,
        profile_picture_url: action.moderator.profile_picture_url
          ? (action.moderator.profile_picture_url as string &
              tags.Format<"uri">)
          : null,
        email_verified: action.moderator.email_verified,
        status: action.moderator.status,
        moderation_permissions: action.moderator.moderation_permissions,
        profile_visibility: action.moderator.profile_visibility,
        activity_visibility: action.moderator.activity_visibility,
        bio: action.moderator.bio ?? null,
        location: action.moderator.location ?? null,
        website_url: action.moderator.website_url
          ? (action.moderator.website_url as string & tags.Format<"uri">)
          : null,
        last_login_at: action.moderator.last_login_at
          ? toISOStringSafe(action.moderator.last_login_at)
          : null,
        created_at: toISOStringSafe(action.moderator.created_at),
        updated_at: toISOStringSafe(action.moderator.updated_at),
        deleted_at: action.moderator.deleted_at
          ? toISOStringSafe(action.moderator.deleted_at)
          : null,
      },
      action_type: action.action_type,
      target_type: action.target_type,
      target_id: action.target_id as string & tags.Format<"uuid">,
      reason: action.reason,
      created_at: toISOStringSafe(action.created_at),
      updated_at: toISOStringSafe(action.updated_at),
    }));

  const active_suspensions: IDiscussionBoardUserSuspension.ISummary[] =
    activeSuspensions.map((suspension) => ({
      id: suspension.id as string & tags.Format<"uuid">,
      suspended_user: {
        id: suspension.suspendedUser.id as string & tags.Format<"uuid">,
        username: suspension.suspendedUser.username,
        display_name: suspension.suspendedUser.display_name ?? null,
        profile_picture_url: suspension.suspendedUser.profile_picture_url
          ? (suspension.suspendedUser.profile_picture_url as string &
              tags.Format<"uri">)
          : null,
      },
      suspension_reason: suspension.suspension_reason,
      suspended_at: toISOStringSafe(suspension.suspended_at),
      expires_at: suspension.expires_at
        ? toISOStringSafe(suspension.expires_at)
        : null,
      lifted_at: suspension.lifted_at
        ? toISOStringSafe(suspension.lifted_at)
        : null,
      created_at: toISOStringSafe(suspension.created_at),
      suspending_moderator: {
        id: suspension.suspendingModerator.id as string & tags.Format<"uuid">,
        username: suspension.suspendingModerator.username,
        display_name: suspension.suspendingModerator.display_name,
        profile_picture_url: suspension.suspendingModerator.profile_picture_url
          ? (suspension.suspendingModerator.profile_picture_url as string &
              tags.Format<"uri">)
          : null,
        email_verified: suspension.suspendingModerator.email_verified,
        status: suspension.suspendingModerator.status,
        moderation_permissions:
          suspension.suspendingModerator.moderation_permissions,
        profile_visibility: suspension.suspendingModerator.profile_visibility,
        activity_visibility: suspension.suspendingModerator.activity_visibility,
        bio: suspension.suspendingModerator.bio ?? null,
        location: suspension.suspendingModerator.location ?? null,
        website_url: suspension.suspendingModerator.website_url
          ? (suspension.suspendingModerator.website_url as string &
              tags.Format<"uri">)
          : null,
        last_login_at: suspension.suspendingModerator.last_login_at
          ? toISOStringSafe(suspension.suspendingModerator.last_login_at)
          : null,
        created_at: toISOStringSafe(suspension.suspendingModerator.created_at),
        updated_at: toISOStringSafe(suspension.suspendingModerator.updated_at),
        deleted_at: suspension.suspendingModerator.deleted_at
          ? toISOStringSafe(suspension.suspendingModerator.deleted_at)
          : null,
      },
      lifting_moderator: suspension.liftingModerator
        ? {
            id: suspension.liftingModerator.id as string & tags.Format<"uuid">,
            username: suspension.liftingModerator.username,
            display_name: suspension.liftingModerator.display_name,
            profile_picture_url: suspension.liftingModerator.profile_picture_url
              ? (suspension.liftingModerator.profile_picture_url as string &
                  tags.Format<"uri">)
              : null,
            email_verified: suspension.liftingModerator.email_verified,
            status: suspension.liftingModerator.status,
            moderation_permissions:
              suspension.liftingModerator.moderation_permissions,
            profile_visibility: suspension.liftingModerator.profile_visibility,
            activity_visibility:
              suspension.liftingModerator.activity_visibility,
            bio: suspension.liftingModerator.bio ?? null,
            location: suspension.liftingModerator.location ?? null,
            website_url: suspension.liftingModerator.website_url
              ? (suspension.liftingModerator.website_url as string &
                  tags.Format<"uri">)
              : null,
            last_login_at: suspension.liftingModerator.last_login_at
              ? toISOStringSafe(suspension.liftingModerator.last_login_at)
              : null,
            created_at: toISOStringSafe(suspension.liftingModerator.created_at),
            updated_at: toISOStringSafe(suspension.liftingModerator.updated_at),
            deleted_at: suspension.liftingModerator.deleted_at
              ? toISOStringSafe(suspension.liftingModerator.deleted_at)
              : null,
          }
        : null,
    }));

  const statistics: IDiscussionBoardModerationDashboardStatistics = {
    pending_reports_count: pendingReportsCount as number & tags.Type<"int32">,
    under_review_reports_count: underReviewReportsCount as number &
      tags.Type<"int32">,
    resolved_reports_count_24h: resolvedReportsCount24h as number &
      tags.Type<"int32">,
    active_suspensions_count: activeSuspensionsCount as number &
      tags.Type<"int32">,
    warnings_issued_count_7d: warningsIssuedCount7d as number &
      tags.Type<"int32">,
    total_moderation_actions_count_24h:
      totalModerationActionsCount24h as number & tags.Type<"int32">,
    urgent_reports_count: urgentReportsCount as number & tags.Type<"int32">,
    average_report_resolution_time_hours: averageReportResolutionTimeHours,
  };

  return {
    pending_reports,
    under_review_reports,
    recent_moderation_actions,
    active_suspensions,
    statistics,
  };
}
