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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityPlatformModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport> {
  // Default values for pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;

  // Cap limit at maximum allowed value of 100
  const effectiveLimit = Math.min(limit, 100);

  // Calculate offset for pagination
  const skip = (page - 1) * effectiveLimit;

  // Build the where clause for database query
  const where: Record<string, unknown> = {};

  // Filter by reporterId if provided
  if (props.body.reporterId !== undefined && props.body.reporterId !== null) {
    where.reporter_id = props.body.reporterId;
  }

  // Filter by targetType if provided
  if (props.body.targetType !== undefined) {
    where.target_type = props.body.targetType;
  }

  // Filter by status if provided
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }

  // Filter by reportReason if provided
  if (props.body.reportReason !== undefined) {
    where.report_reason = props.body.reportReason;
  }

  // Filter by date range for created_at if provided
  const created_at: Record<string, unknown> = {};
  if (props.body.startDate !== undefined) {
    created_at.gte = props.body.startDate;
  }
  if (props.body.endDate !== undefined) {
    created_at.lte = props.body.endDate;
  }

  // Only add created_at filter if any date constraint exists
  if (Object.keys(created_at).length > 0) {
    where.created_at = created_at;
  }

  // Determine sort field and order
  let orderBy: Record<string, string> = {};
  const sortField = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.order ?? "desc";

  // Validate sort field against allowed values to prevent injection
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "target_popularity",
    "moderator_actions",
  ];
  if (allowedSortFields.includes(sortField)) {
    orderBy[sortField] = sortOrder;
  } else {
    // Default to created_at if invalid sort field provided
    orderBy.created_at = sortOrder;
  }

  // Fetch total count of matching reports
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where,
  });

  // Fetch paginated reports with essential fields only
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where,
    orderBy,
    skip,
    take: effectiveLimit,
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

  // Calculate total pages
  const pages = Math.ceil(total / effectiveLimit);

  // Return paginated response with proper type structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(effectiveLimit),
      records: Number(total),
      pages: Number(pages),
    },
    data: reports.map((report) => ({
      id: report.id satisfies string as string,
      reported_content_id:
        report.reported_content_id !== null
          ? (report.reported_content_id satisfies string as string)
          : undefined,
      reported_comment_id:
        report.reported_comment_id !== null
          ? (report.reported_comment_id satisfies string as string)
          : undefined,
      reporter_id: report.reporter_id satisfies string as string,
      target_type: report.target_type satisfies string as string,
      status: report.status satisfies string as string,
      report_reason: report.report_reason satisfies string as string,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    })),
  };
}
