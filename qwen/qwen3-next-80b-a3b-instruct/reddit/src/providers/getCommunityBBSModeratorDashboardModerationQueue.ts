import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityBBSModeratorDashboardModerationQueue(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityBBSReport.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  // Fetch pending reports with full context
  const reports = await MyGlobal.prisma.community_bbs_reports.findMany({
    where: {
      status: "pending",
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    include: {
      reason: {
        select: { name: true },
      },
      // Use native Prisma relations to get target IDs
      // but no joins needed since DTO is string placeholder
    },
  });

  // Total count for pagination
  const total = await MyGlobal.prisma.community_bbs_reports.count({
    where: {
      status: "pending",
      deleted_at: null,
    },
  });

  // Build data array - ICommunityBBSReport.ISummary is defined as string
  // Placeholder implementation: return the report ID as string since DTO is string
  const data: ICommunityBBSReport.ISummary[] = reports.map(
    (report) => report.id,
  );

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
