import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport> {
  const {
    reporterId,
    targetType,
    status,
    reportReason,
    page = 1,
    limit = 25,
    sortBy = "created_at",
    order = "desc",
    startDate,
    endDate,
  } = props.body;

  // Build where conditions with proper schema field names and null/undefined handling
  const where: Prisma.community_platform_reportsWhereInput = {};

  // Handle reporterId filter - must be both undefined and null checked
  if (reporterId !== undefined && reporterId !== null) {
    where.reporter_id = reporterId;
  }

  // Handle targetType filter
  if (targetType !== undefined) {
    where.target_type = targetType;
  }

  // Handle status filter
  if (status !== undefined) {
    where.status = status;
  }

  // Handle reportReason filter
  if (reportReason !== undefined) {
    where.report_reason = reportReason;
  }

  // Handle date range filters
  if (startDate !== undefined || endDate !== undefined) {
    where.created_at = {};
    if (startDate !== undefined) {
      where.created_at.gte = toISOStringSafe(startDate);
    }
    if (endDate !== undefined) {
      where.created_at.lte = toISOStringSafe(endDate);
    }
  }

  // Build orderBy based on sortBy and order
  const orderBy: { created_at?: "asc" | "desc"; updated_at?: "asc" | "desc" } =
    {
      created_at: undefined,
      updated_at: undefined,
    };

  // Handle sortBy alternatives - target_popularity and moderator_actions are NOT fields in community_platform_reports
  // Follow schema-first approach - only use existing schema fields
  if (sortBy === "created_at") {
    orderBy.created_at = order === "asc" ? "asc" : "desc";
  } else if (sortBy === "updated_at") {
    orderBy.updated_at = order === "asc" ? "asc" : "desc";
  } else if (sortBy === "target_popularity") {
    // target_popularity isn't a field in the schema - use created_at as fallback
    orderBy.created_at = order === "asc" ? "asc" : "desc";
  } else if (sortBy === "moderator_actions") {
    // moderator_actions isn't a field in the schema - use updated_at as fallback
    orderBy.updated_at = order === "asc" ? "asc" : "desc";
  } else {
    // Default case
    orderBy.created_at = order === "asc" ? "asc" : "desc";
  }

  // Calculate pagination offset
  const skip = Math.max(0, (page - 1) * limit);

  // Fetch reports with only fields that exist in the schema
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      reported_content_id: true,
      reported_comment_id: true,
      reporter_id: true,
      target_type: true,
      status: true,
      report_reason: true,
      created_at: true,
      updated_at: true,
    },
  });

  // Count total records
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where,
  });

  // Transform results with direct toISOStringSafe conversion on date fields
  // No conversions on non-date fields
  const transformedReports = reports.map((report) => {
    return {
      id: report.id,
      reported_content_id:
        report.reported_content_id !== null
          ? (report.reported_content_id satisfies string as string &
              tags.Format<"uuid">)
          : undefined,
      reported_comment_id:
        report.reported_comment_id !== null
          ? (report.reported_comment_id satisfies string as string &
              tags.Format<"uuid">)
          : undefined,
      reporter_id: report.reporter_id,
      target_type: report.target_type,
      status: report.status,
      report_reason: report.report_reason,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    };
  });

  // Build pagination object - Note: page and limit are already validated by the schema.
  // Use Number() to strip brand types as required for IPage.IPagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedReports,
  };
}
