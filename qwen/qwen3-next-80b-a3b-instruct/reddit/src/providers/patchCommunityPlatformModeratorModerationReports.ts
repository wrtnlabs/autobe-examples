import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";

export async function patchCommunityPlatformModeratorModerationReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const { status, target_type, page = 1, limit = 20 } = props.body;
  // Calculate offset for pagination
  const skip = (page - 1) * limit;
  // Fix Prisma query conditions - use proper null handling for relations
  const rawReportData =
    await MyGlobal.prisma.community_platform_reports.findMany({
      where: {
        status: status.toUpperCase() as "Pending" | "Approved" | "Dismissed",
        deleted_at: null,
        OR: [
          {
            post: { isNot: null },
            comment: null,
          },
          {
            comment: { isNot: null },
            post: null,
          },
        ],
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformReportAtSummaryTransformer.select(),
    });
  // Fix transformation - reporter property must be always present as { username: string } to match transformer expectation
  const transformedReportData = rawReportData.map((report) => ({
    ...report,
    post: report.post ? { id: report.post.id } : null, // Use 'post' relation field from transformer select
    comment: report.comment ? { id: report.comment.id } : null, // Use 'comment' relation field from transformer select
    reporter: report.reporter
      ? { username: report.reporter.username }
      : { username: "" }, // Use 'reporter' relation field from transformer select
  }));
  // Count total reports matching criteria (with same conditions)
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: {
      status: status.toUpperCase() as "Pending" | "Approved" | "Dismissed",
      deleted_at: null,
      OR: [
        {
          post: { isNot: null },
          comment: null,
        },
        {
          comment: { isNot: null },
          post: null,
        },
      ],
    },
  });
  // Transform results using already-loaded transformer
  const result = await ArrayUtil.asyncMap(
    transformedReportData,
    CommunityPlatformReportAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: result,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
