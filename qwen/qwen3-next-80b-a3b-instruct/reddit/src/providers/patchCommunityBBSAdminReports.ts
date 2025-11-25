import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { IPageICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityBBSAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityBBSReport.IRequest;
}): Promise<IPageICommunityBBSReport.ISummary> {
  // Parse the IRequest body as JSON with zero-trust validation
  let filter: {
    status?: string;
    actor_type?: string;
    targeted_entity_type?: string;
    created_at_from?: string & tags.Format<"date-time">;
    created_at_to?: string & tags.Format<"date-time">;
    reviewed_at_from?: string & tags.Format<"date-time">;
    reviewed_at_to?: string & tags.Format<"date-time">;
    page?: number;
    limit?: number;
  };
  try {
    filter = JSON.parse(props.body);
  } catch {
    // Invalid JSON - treat as empty filter
    filter = {};
  }

  // Default pagination values
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 100;
  const skip = (page - 1) * limit;

  // Validate pagination parameters are valid integers >= 1
  // This is business logic, NOT type validation - parameters are already string/number
  // We're validating their business meaning, not their type
  if (page < 1 || !Number.isInteger(page)) {
    throw new HttpException("Page must be a positive integer", 400);
  }
  if (limit < 1 || !Number.isInteger(limit)) {
    throw new HttpException("Limit must be a positive integer", 400);
  }
  if (limit > 1000) {
    throw new HttpException("Limit cannot exceed 1000", 400);
  }

  // Build dynamic where condition with typed structure
  const where: Prisma.community_bbs_reportsWhereInput = {};

  // Filter by status (default: any)
  if (filter.status) {
    where.status = filter.status;
  }

  // Filter by actor_type (citizen, moderator, admin)
  if (filter.actor_type) {
    where.actor_type = filter.actor_type;
  }

  // Filter by targeted_entity_type (post, comment)
  if (filter.targeted_entity_type) {
    where.targeted_entity_type = filter.targeted_entity_type;
  }

  // Filter by created_at range
  if (filter.created_at_from || filter.created_at_to) {
    where.created_at = {};
    if (filter.created_at_from) where.created_at.gte = filter.created_at_from;
    if (filter.created_at_to) where.created_at.lte = filter.created_at_to;
  }

  // Filter by reviewed_at range
  if (filter.reviewed_at_from || filter.reviewed_at_to) {
    where.reviewed_at = {};
    if (filter.reviewed_at_from)
      where.reviewed_at.gte = filter.reviewed_at_from;
    if (filter.reviewed_at_to) where.reviewed_at.lte = filter.reviewed_at_to;
  }

  // Fetch reports and count
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.community_bbs_reports.count({ where }),
  ]);

  // Map to summary structure - ICommunityBBSReport.ISummary is defined as string in DTO
  // According to the provided documentation, ICommunityBBSReport.ISummary is a string type
  // This suggests the summary is likely a JSON string representation of the report data
  const summaryReports = reports.map((report: any) => {
    // Convert the entire report object to a JSON string to match ICommunityBBSReport.ISummary type
    return JSON.stringify({
      id: report.id,
      citizen_id: report.citizen_id,
      moderator_id: report.moderator_id,
      admin_id: report.admin_id,
      report_reason_id: report.report_reason_id,
      actor_type: report.actor_type,
      targeted_entity_type: report.targeted_entity_type,
      status: report.status,
      review_status: report.review_status,
      comment: report.comment,
      created_at: report.created_at ? toISOStringSafe(report.created_at) : null,
      updated_at: report.updated_at ? toISOStringSafe(report.updated_at) : null,
      reviewed_at: report.reviewed_at
        ? toISOStringSafe(report.reviewed_at)
        : null,
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    });
  });

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryReports,
  };
}
