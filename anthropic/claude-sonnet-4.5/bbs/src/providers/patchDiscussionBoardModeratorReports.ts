import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  const { body } = props;

  // Build where clause with SQLite compatibility (no mode property)
  const whereConditions = {
    deleted_at: null,
    ...(body.discussion_board_member_id !== undefined &&
      body.discussion_board_member_id !== null && {
        discussion_board_member_id: body.discussion_board_member_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.report_reason !== undefined &&
      body.report_reason !== null && {
        report_reason: body.report_reason,
      }),
    ...(body.target_type !== undefined && body.target_type !== null
      ? body.target_type === "article"
        ? { reported_article_id: { not: null } }
        : { reported_comment_id: { not: null } }
      : {}),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
    ...(body.reporter_username !== undefined &&
      body.reporter_username !== null && {
        reporter: {
          username: body.reporter_username,
        },
      }),
    ...(body.reviewing_moderator_username !== undefined &&
      body.reviewing_moderator_username !== null && {
        reviewingModerator: {
          username: body.reviewing_moderator_username,
        },
      }),
  };

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Determine sort field and order
  const sortBy = body.sort_by ?? "priority";
  const sortOrder = (body.sort_order ?? "desc") as "asc" | "desc";

  let reports: Array<{
    id: string;
    discussion_board_member_id: string;
    reported_article_id: string | null;
    reported_comment_id: string | null;
    reviewing_moderator_id: string | null;
    report_reason: string;
    report_details: string | null;
    status: string;
    resolution_notes: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    reporter: {
      id: string;
      username: string;
      display_name: string | null;
      profile_picture_url: string | null;
    };
    reviewingModerator: {
      id: string;
      username: string;
      display_name: string | null;
      profile_picture_url: string | null;
      email_verified: boolean;
      status: string;
      moderation_permissions: string;
      profile_visibility: string;
      activity_visibility: string;
      bio: string | null;
      location: string | null;
      website_url: string | null;
      last_login_at: Date | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
  }>;
  let total: number;

  if (sortBy === "priority") {
    // For priority sorting, fetch all reports and sort by count in memory
    const allReports = await MyGlobal.prisma.discussion_board_reports.findMany({
      where: whereConditions,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
          },
        },
        reviewingModerator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            profile_picture_url: true,
            email_verified: true,
            status: true,
            moderation_permissions: true,
            profile_visibility: true,
            activity_visibility: true,
            bio: true,
            location: true,
            website_url: true,
            last_login_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });

    // Count reports per target
    const targetCounts = new Map<string, number>();
    for (const report of allReports) {
      const targetId =
        report.reported_article_id || report.reported_comment_id || "";
      targetCounts.set(targetId, (targetCounts.get(targetId) || 0) + 1);
    }

    // Sort by priority
    const sortedReports = allReports.sort((a, b) => {
      const targetA = a.reported_article_id || a.reported_comment_id || "";
      const targetB = b.reported_article_id || b.reported_comment_id || "";
      const countA = targetCounts.get(targetA) || 0;
      const countB = targetCounts.get(targetB) || 0;

      if (sortOrder === "desc") {
        return countB - countA;
      }
      return countA - countB;
    });

    total = sortedReports.length;
    reports = sortedReports.slice(skip, skip + take);
  } else {
    // Database sorting for other fields
    const orderByField =
      sortBy === "created_at"
        ? "created_at"
        : sortBy === "updated_at"
          ? "updated_at"
          : sortBy === "status"
            ? "status"
            : "created_at";

    const [fetchedReports, count] = await Promise.all([
      MyGlobal.prisma.discussion_board_reports.findMany({
        where: whereConditions,
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              display_name: true,
              profile_picture_url: true,
            },
          },
          reviewingModerator: {
            select: {
              id: true,
              username: true,
              display_name: true,
              profile_picture_url: true,
              email_verified: true,
              status: true,
              moderation_permissions: true,
              profile_visibility: true,
              activity_visibility: true,
              bio: true,
              location: true,
              website_url: true,
              last_login_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
        orderBy: { [orderByField]: sortOrder },
        skip,
        take,
      }),
      MyGlobal.prisma.discussion_board_reports.count({
        where: whereConditions,
      }),
    ]);

    reports = fetchedReports;
    total = count;
  }

  // Map to response format
  const data: IDiscussionBoardReport.ISummary[] = reports.map((report) => {
    const reportedContentType: "article" | "comment" =
      report.reported_article_id !== null ? "article" : "comment";

    return {
      id: report.id,
      reporter: {
        id: report.reporter.id,
        username: report.reporter.username,
        display_name: report.reporter.display_name ?? undefined,
        profile_picture_url: report.reporter.profile_picture_url ?? undefined,
      },
      reported_article_id: report.reported_article_id,
      reported_comment_id: report.reported_comment_id,
      reported_content_type: reportedContentType,
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
            id: report.reviewingModerator.id,
            username: report.reviewingModerator.username,
            display_name: report.reviewingModerator.display_name,
            profile_picture_url: report.reviewingModerator.profile_picture_url,
            email_verified: report.reviewingModerator.email_verified,
            status: report.reviewingModerator.status,
            moderation_permissions:
              report.reviewingModerator.moderation_permissions,
            profile_visibility: report.reviewingModerator.profile_visibility,
            activity_visibility: report.reviewingModerator.activity_visibility,
            bio: report.reviewingModerator.bio ?? undefined,
            location: report.reviewingModerator.location ?? undefined,
            website_url: report.reviewingModerator.website_url ?? undefined,
            last_login_at: report.reviewingModerator.last_login_at
              ? toISOStringSafe(report.reviewingModerator.last_login_at)
              : undefined,
            created_at: toISOStringSafe(report.reviewingModerator.created_at),
            updated_at: toISOStringSafe(report.reviewingModerator.updated_at),
            deleted_at: report.reviewingModerator.deleted_at
              ? toISOStringSafe(report.reviewingModerator.deleted_at)
              : undefined,
          }
        : null,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
