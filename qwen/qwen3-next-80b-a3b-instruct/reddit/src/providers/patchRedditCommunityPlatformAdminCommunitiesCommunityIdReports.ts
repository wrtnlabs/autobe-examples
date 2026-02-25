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

export async function patchRedditCommunityPlatformAdminCommunitiesCommunityIdReports(props: {
  platformAdmin: PlatformadminPayload;
  communityId: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const { status, sort, timeFilter, search } = props.body;
  // Build where condition using direct foreign key access per loaded schema
  const where: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    // Filter by community via direct post_id or comment_id
    OR: [
      {
        postReport: {
          post_id: {
            equals: props.communityId,
          },
        },
      },
      {
        commentReport: {
          comment_id: {
            equals: props.communityId,
          },
        },
      },
    ],
  };
  // Add status filter
  if (status) {
    where.status = status;
  }
  // Add search filter on reason
  if (search) {
    where.reason = { contains: search, mode: "insensitive" };
  }
  // Build order by
  const orderBy: Prisma.reddit_community_reportsOrderByWithRelationInput =
    sort === "oldest" ? { created_at: "asc" } : { created_at: "desc" }; // 'most-reported' falls back to newest
  // Time filter: use Prisma's date functions to handle UTC timezone properly
  if (timeFilter) {
    const now = new Date();
    let gte: string | undefined;
    switch (timeFilter) {
      case "today":
        gte = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "week":
        gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "month":
        gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "year":
        gte = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }
    if (gte) {
      where.created_at = { gte };
    }
  }
  // Query data
  const data = await MyGlobal.prisma.reddit_community_reports.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
