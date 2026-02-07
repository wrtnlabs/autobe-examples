import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
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

export async function patchCommunityAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  // Default pagination parameters
  const page = 1;
  const limit = 10;
  // Calculate cursor offset
  const skip = (page - 1) * limit;
  // Fetch all reports (no filtering possible since IRequest is empty)
  const reports = await MyGlobal.prisma.community_reports.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Transform reports with resolved reporter types
  const summaryData: ICommunityReport.ISummary[] = [];
  for (const report of reports) {
    // Determine reporter type by checking existence in each actor table
    let reporter_type: "guest" | "member" | "moderator" | "admin" | null = null;
    // Check if reporter exists in community_guests and is active
    const guest = await MyGlobal.prisma.community_guests.findFirst({
      where: {
        id: report.reporter_id,
        deleted_at: null,
      },
    });
    if (guest) reporter_type = "guest";
    // Check if reporter exists in community_members and is active
    if (!reporter_type) {
      const member = await MyGlobal.prisma.community_members.findFirst({
        where: {
          id: report.reporter_id,
          deleted_at: null,
        },
      });
      if (member) reporter_type = "member";
    }
    // Check if reporter exists in community_moderators and is active
    if (!reporter_type) {
      const moderator = await MyGlobal.prisma.community_moderators.findFirst({
        where: {
          id: report.reporter_id,
          deleted_at: null,
        },
      });
      if (moderator) reporter_type = "moderator";
    }
    // Check if reporter exists in community_admins and is active
    if (!reporter_type) {
      const admin = await MyGlobal.prisma.community_admins.findFirst({
        where: {
          id: report.reporter_id,
          deleted_at: null,
        },
      });
      if (admin) reporter_type = "admin";
    }
    // Skip report if reporter was deleted or doesn't exist
    if (!reporter_type) continue;
    // Construct summary with proper type safety
    summaryData.push({
      id: report.id,
      reporter_id: report.reporter_id,
      reporter_type: reporter_type,
      reported_content_id: report.reported_content_id,
      content_type: report.content_type,
      reason: report.reason,
      status: report.status,
      created_at: toISOStringSafe(report.created_at),
    });
  }
  // Count total reports matching criteria
  const total = await MyGlobal.prisma.community_reports.count({ where: {} });
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
