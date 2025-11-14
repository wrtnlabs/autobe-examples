import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostReport";
import { IPageIPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticalForumPostReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchPoliticalForumModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IPoliticalForumPostReport.IRequest;
}): Promise<IPageIPoliticalForumPostReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build conditions for each report type table
  const postWhere: Record<string, unknown> = {};
  const commentWhere: Record<string, unknown> = {};

  // Apply filters to both tables
  const applyFilter = (
    where: Record<string, unknown>,
    filter: string,
    value: any,
  ) => {
    if (value !== undefined) {
      where[filter] = value;
    }
  };

  // Status
  if (props.body.status) {
    applyFilter(postWhere, "status", props.body.status);
    applyFilter(commentWhere, "status", props.body.status);
  }

  // Date range
  if (props.body.created_after) {
    applyFilter(postWhere, "created_at", { gte: props.body.created_after });
    applyFilter(commentWhere, "created_at", { gte: props.body.created_after });
  }

  if (props.body.created_before) {
    applyFilter(postWhere, "created_at", { lte: props.body.created_before });
    applyFilter(commentWhere, "created_at", { lte: props.body.created_before });
  }

  // Search
  if (props.body.search) {
    applyFilter(postWhere, "reason", {
      contains: props.body.search,
      mode: "insensitive",
    });
    applyFilter(commentWhere, "reason", {
      contains: props.body.search,
      mode: "insensitive",
    });
  }

  // Report type filter
  if (props.body.report_type === "post") {
    // Only query post reports
    commentWhere["id"] = "INVALID"; // Inline impossible filter
  } else if (props.body.report_type === "comment") {
    // Only query comment reports
    postWhere["id"] = "INVALID"; // Inline impossible filter
  }

  // Apply soft delete exclusion
  postWhere.deleted_at = null;
  commentWhere.deleted_at = null;

  // Query reports from both tables
  const [postReports, commentReports] = await Promise.all([
    MyGlobal.prisma.political_forum_post_reports.findMany({
      where: postWhere,
      orderBy: {
        [props.body.sort_by ?? "created_at"]:
          props.body.order === "desc" ? "desc" : "asc",
      },
    }),
    MyGlobal.prisma.political_forum_comment_reports.findMany({
      where: commentWhere,
      orderBy: {
        [props.body.sort_by ?? "created_at"]:
          props.body.order === "desc" ? "desc" : "asc",
      },
    }),
  ]);

  // Combine and transform results
  const mergedReports = [
    ...postReports.map((report) => ({
      id: report.id,
      report_type: "post" as const,
      status: report.status as
        | "pending"
        | "reviewed"
        | "dismissed"
        | "escalated",
      created_at: toISOStringSafe(report.created_at),
      report_target_id: report.political_forum_post_id,
      reporter_id: report.political_forum_citizen_id,
      reason: report.reason,
      decision_notes: null,
    })),
    ...commentReports.map((report) => ({
      id: report.id,
      report_type: "comment" as const,
      status: report.status as
        | "pending"
        | "reviewed"
        | "dismissed"
        | "escalated",
      created_at: toISOStringSafe(report.created_at),
      report_target_id: report.political_forum_comment_id,
      reporter_id: report.political_forum_citizen_id,
      reason: report.reason,
      decision_notes: null,
    })),
  ];

  // Sort combined results
  const sortedReportList = mergedReports.sort((a, b) => {
    if (props.body.sort_by === "created_at") {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      if (aDate !== bDate) {
        return props.body.order === "desc" ? bDate - aDate : aDate - bDate;
      }
    } else if (props.body.sort_by === "status") {
      const statusOrder = {
        pending: 0,
        reviewed: 1,
        dismissed: 2,
        escalated: 3,
      } as const;
      if (a.status !== b.status) {
        const aOrder = statusOrder[a.status];
        const bOrder = statusOrder[b.status];
        return props.body.order === "desc" ? bOrder - aOrder : aOrder - bOrder;
      }
    }
    // Default: sort by created_at descending if sort_by not provided or equal
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return bDate - aDate;
  });

  // Apply pagination to sorted array
  const paginatedReports = sortedReportList.slice(skip, skip + limit);

  // Count total reports (both types)
  const totalCount = postReports.length + commentReports.length;

  // min_report_count filter (advanced)
  if (props.body.min_report_count) {
    // Count reports per target item
    const targetCounts: Map<string, number> = new Map();

    // We need to count reports per target (post_id or comment_id)
    for (const report of mergedReports) {
      const key =
        report.report_type === "post"
          ? report.report_target_id
          : `${report.report_type}_${report.report_target_id}`;
      targetCounts.set(key, (targetCounts.get(key) || 0) + 1);
    }

    // Filter reports to only those whose target has >= min_report_count
    const filteredReports = paginatedReports.filter((report) => {
      const key =
        report.report_type === "post"
          ? report.report_target_id
          : `${report.report_type}_${report.report_target_id}`;
      const count = targetCounts.get(key);
      if (count === undefined) return false;
      return count >= props.body.min_report_count!;
    });

    // Re-apply pagination
    const newTotal = sortedReportList.filter((report) => {
      const key =
        report.report_type === "post"
          ? report.report_target_id
          : `${report.report_type}_${report.report_target_id}`;
      const count = targetCounts.get(key);
      if (count === undefined) return false;
      return count >= props.body.min_report_count!;
    }).length;

    return {
      pagination: {
        page,
        pageSize: limit,
        total: newTotal,
        totalPages: Math.ceil(newTotal / limit),
      },
      data: filteredReports,
    };
  }

  // Return final result
  return {
    pagination: {
      page,
      pageSize: limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: paginatedReports,
  };
}
