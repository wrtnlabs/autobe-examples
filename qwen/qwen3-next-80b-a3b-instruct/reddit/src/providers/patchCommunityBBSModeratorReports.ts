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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchCommunityBBSModeratorReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityBBSReport.IRequest;
}): Promise<IPageICommunityBBSReport.ISummary> {
  // Extract pagination parameters from body (which is a string in this case)
  // According to DTO, body is IRequest = string — interpreted as a search query string
  // We treat this as an opaque search term for full-text or fuzzy search on report fields
  const searchQuery = props.body;

  // Default pagination
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Build where condition — filtering by search query using LIKE pattern
  const whereCondition: any = { deleted_at: null };

  // If searchQuery is non-empty, search across relevant string fields
  if (searchQuery && searchQuery.trim() !== "") {
    const searchPattern = searchQuery.trim();
    whereCondition.OR = [
      { comment: { contains: searchPattern } },
      { actor_type: { contains: searchPattern } },
      { targeted_entity_type: { contains: searchPattern } },
      { status: { contains: searchPattern } },
      { review_status: { contains: searchPattern } },
    ];
  }

  // Query with pagination
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.community_bbs_reports.count({ where: whereCondition }),
  ]);

  // Transform to summary format with proper null/undefined handling
  // Extract only the comment field as the data array for summary, null-safe
  const summaryReports = reports.map((report) => {
    return report.comment !== null ? report.comment : "";
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryReports,
  };
}
