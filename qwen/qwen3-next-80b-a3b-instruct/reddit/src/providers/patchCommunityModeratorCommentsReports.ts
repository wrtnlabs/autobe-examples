import { ICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityModeratorCommentsReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityCommentReport.IRequest;
}): Promise<IPageICommunityCommentReport.ISummary> {
  const {
    status,
    reporter_id,
    reported_comment_id,
    created_at_start,
    created_at_end,
    sort_by = "created_at",
    order = "desc",
    limit = 10,
    offset = 0,
  } = props.body;
  // Build where clause with all filters
  const whereClause: Prisma.community_comment_reportsWhereInput = {
    deleted_at: null,
    ...(status && { status }),
    ...(reporter_id && { reporter_id }),
    ...(reported_comment_id && { reported_comment_id }),
    ...(created_at_start && { created_at: { gte: created_at_start } }),
    ...(created_at_end && { created_at: { lte: created_at_end } }),
  };
  // Configure ordering based on sort_by and order
  const orderBy: Prisma.community_comment_reportsOrderByWithRelationInput =
    sort_by === "status"
      ? { status: order === "asc" ? "asc" : "desc" }
      : sort_by === "reporter_type"
        ? { reporter_id: order === "asc" ? "asc" : "desc" }
        : { created_at: order === "asc" ? "asc" : "desc" };
  // Fetch the paginated reports
  const reports = await MyGlobal.prisma.community_comment_reports.findMany({
    where: whereClause,
    orderBy,
    skip: offset,
    take: limit,
  });
  // Count total matching records for pagination
  const total = await MyGlobal.prisma.community_comment_reports.count({
    where: whereClause,
  });
  // Map to summary structure (ICommunityCommentReport.ISummary)
  // Specification requires: report_id, status, reason_preview, created_at, reporter_display_name, comment_preview
  // We'll use the existing ids and fetch the necessary data
  const summaryData = await Promise.all(
    reports.map(async (report) => {
      // Get the reported comment
      const comment = await MyGlobal.prisma.community_comments.findUnique({
        where: { id: report.reported_comment_id },
        select: { content: true },
      });
      // Get the reporter display_name from community_members, community_moderators, or community_admins
      // First, try community_members (regular users)
      let reporter = await MyGlobal.prisma.community_members.findUnique({
        where: { id: report.reporter_id, deleted_at: null },
        select: { display_name: true },
      });
      // If not found in members, try moderators
      if (!reporter) {
        reporter = await MyGlobal.prisma.community_moderators.findUnique({
          where: { id: report.reporter_id, deleted_at: null },
          select: { display_name: true },
        });
      }
      // If not found in moderators, try admins
      if (!reporter) {
        reporter = await MyGlobal.prisma.community_admins.findUnique({
          where: { id: report.reporter_id, deleted_at: null },
          select: { display_name: true },
        });
      }
      // Create summary object with required fields
      return {
        id: report.id as string & tags.Format<"uuid">,
        status: report.status,
        reason_preview:
          report.reason.length > 100
            ? report.reason.substring(0, 97) + "..."
            : report.reason,
        created_at: toISOStringSafe(report.created_at),
        reporter_display_name: (reporter?.display_name ??
          "Anonymous") satisfies string as string,
        comment_preview: comment?.content
          ? comment.content.length > 100
            ? comment.content.substring(0, 97) + "..."
            : comment.content
          : "",
      };
    }),
  );
  return {
    data: summaryData,
    pagination: {
      current: Math.floor(offset / limit) + 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
