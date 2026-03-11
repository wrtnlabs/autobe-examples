import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { IRedditPlatformModeratorDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorDashboardSummary";
import { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { IRedditPlatformPendingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPendingReport";
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

export async function getRedditPlatformAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IRedditPlatformModeratorHistory.IResponse> {
  // Verify admin exists and is active
  const adminRecord = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: {
      id: props.admin.id,
      is_active: true,
    },
  });
  if (adminRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find all communities where this admin has moderator privileges
  const moderatorRecords =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: props.admin.id,
      },
      include: {
        community: true,
      },
    });
  if (moderatorRecords.length === 0) {
    // Admin has no moderator communities - return empty dashboard
    return {
      summary: {
        pending_count: 0,
        resolved_count: 0,
        dismissed_count: 0,
        communities_count: 0,
        reports_over_24h: 0,
      },
      reports: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }
  // Extract community IDs for filtering reports
  const communityIds = moderatorRecords.map((m) => m.community_id);
  // Fetch all reports for moderated communities with necessary joins
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: {
      community_id: {
        in: communityIds,
      },
      deleted_at: null,
    },
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      resolvedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
  // Filter only pending reports for the dashboard
  const pendingReports = reports.filter(
    (
      r,
    ): r is typeof r & {
      status: "pending";
    } => r.status === "pending",
  );
  // Calculate summary statistics
  const summary: IRedditPlatformModeratorDashboardSummary = {
    pending_count: reports.filter((r) => r.status === "pending").length,
    resolved_count: reports.filter((r) => r.status === "resolved").length,
    dismissed_count: reports.filter((r) => r.status === "dismissed").length,
    communities_count: reports.reduce((acc, r) => {
      acc.add(r.community_id);
      return acc;
    }, new Set<string>()).size,
    reports_over_24h: reports.filter((r): boolean => {
      if (r.status !== "pending") {
        return false;
      }
      const createdTimeMs = new Date(r.created_at).getTime();
      const nowMs = new Date().getTime();
      const hoursDiff = (nowMs - createdTimeMs) / (1000 * 60 * 60);
      return hoursDiff > 24;
    }).length,
  };
  // Transform pending reports to response format
  const reportList: IRedditPlatformPendingReport[] = await ArrayUtil.asyncMap(
    pendingReports,
    async (report) => {
      // Get content title or preview based on reported_content_type
      let contentTitle: string | null = null;
      let contentPreview: string | null = null;
      if (report.reported_content_type === "POST") {
        const post = await MyGlobal.prisma.reddit_platform_posts.findFirst({
          where: {
            id: report.reported_content_id,
          },
          select: {
            title: true,
          },
        });
        contentTitle = post?.title ?? null;
      } else if (report.reported_content_type === "COMMENT") {
        const comment =
          await MyGlobal.prisma.reddit_platform_comments.findFirst({
            where: {
              id: report.reported_content_id,
            },
            select: {
              content: true,
            },
          });
        if (comment?.content) {
          contentPreview = comment.content.slice(0, 200);
        }
      }
      // Calculate time elapsed since submission
      const createdTimeMs = new Date(report.created_at).getTime();
      const nowMs = new Date().getTime();
      const hoursDiff = (nowMs - createdTimeMs) / (1000 * 60 * 60);
      let timeElapsed: string;
      if (hoursDiff < 1) {
        const minutes = Math.floor(hoursDiff * 60);
        timeElapsed =
          minutes === 0
            ? "just now"
            : `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      } else if (hoursDiff < 24) {
        const hours = Math.floor(hoursDiff);
        timeElapsed = `${hours} hour${hours > 1 ? "s" : ""} ago`;
      } else {
        const days = Math.floor(hoursDiff / 24);
        timeElapsed = `${days} day${days > 1 ? "s" : ""} ago`;
      }
      return {
        id: report.id,
        status: report.status,
        reason: report.reason,
        created_at: toISOStringSafe(report.created_at),
        reporter_id: report.reporter_id,
        reporter_username: report.reporter.username,
        community_id: report.community_id,
        community_name: report.community.name,
        reported_content_type: report.reported_content_type as
          | "POST"
          | "COMMENT",
        content_title: contentTitle,
        content_preview: contentPreview,
        time_elapsed: timeElapsed,
      };
    },
  );
  // Calculate pagination
  const page = 1;
  const limit = 20;
  const total = pendingReports.length;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  // Slice reports for this page
  const paginatedReports = reportList.slice((page - 1) * limit, page * limit);
  return {
    summary,
    reports: paginatedReports,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
