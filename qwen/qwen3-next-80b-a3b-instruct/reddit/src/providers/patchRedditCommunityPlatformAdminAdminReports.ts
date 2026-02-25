import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminAdminReports(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  // Validate pagination parameters per spec
  const page = props.body.page ?? 1;
  if (page < 1) throw new HttpException("Page must be >= 1", 400);
  const limit = props.body.limit ?? 20;
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  const skip = (page - 1) * limit;
  // Validate and normalize search parameters
  const search = props.body.search?.trim();
  // Build WHERE conditions
  const where: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(search && {
      reason: { contains: search, mode: "insensitive" },
    }),
  };
  // Handle timeFilter - convert to ISO strings using Date-only logic (no Date objects in return types)
  if (props.body.timeFilter) {
    const now = new Date();
    let since: string;
    switch (props.body.timeFilter) {
      case "today":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "week":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "month":
        since = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "year":
        since = new Date(
          now.getTime() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "all":
      default:
        since = "0001-01-01T00:00:00.000Z";
    }
    where.created_at = { gte: since };
  }
  // Handle sort: only 'newest', 'oldest' are valid; 'most-reported' is unsupported without aggregation
  const orderBy: Prisma.reddit_community_reportsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Fetch data with joins to reporter and resolver usernames
  const reports = await MyGlobal.prisma.reddit_community_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.reddit_community_reports.count({ where });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
