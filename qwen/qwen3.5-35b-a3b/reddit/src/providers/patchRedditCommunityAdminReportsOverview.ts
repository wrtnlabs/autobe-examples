import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportsOverview";
import { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
import { IRedditCommunityReportsOverviewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewRequest";
import { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityReportsOverviewTransformer } from "../transformers/RedditCommunityReportsOverviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminReportsOverview(props: {
  admin: AdminPayload;
  body: IRedditCommunityReportsOverviewRequest;
}): Promise<IPageIRedditCommunityReportsOverview> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    status_id: 0,
    community_id: props.admin.id,
  };
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    ...baseWhere,
  };
  if (props.body.createdAfter) {
    whereInput.created_at = {
      gte: new Date(props.body.createdAfter),
    };
  }
  if (props.body.createdBefore) {
    if (whereInput.created_at) {
      (
        whereInput.created_at as Prisma.DateTimeFilter<"reddit_community_reports">
      ).lt = new Date(props.body.createdBefore);
    } else {
      whereInput.created_at = {
        lt: new Date(props.body.createdBefore),
      };
    }
  }
  if (props.body.contentType === "post") {
    whereInput.target_post_id = { not: null };
  } else if (props.body.contentType === "comment") {
    whereInput.target_comment_id = { not: null };
  }
  if (props.body.reporterUsername) {
    whereInput.reporter = {
      username: {
        contains: props.body.reporterUsername,
      },
    };
  }
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: buildOrderBy(props.body),
    ...RedditCommunityReportsOverviewTransformer.select(),
  });
  const statistics: IRedditCommunityReportsOverviewStatistic =
    await computeStatistics(whereInput);
  const overview = await RedditCommunityReportsOverviewTransformer.transform(
    records,
    statistics,
    {
      currentPage: page,
      pageSize: limit,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasPreviousPage: page > 1,
      hasNextPage: page < Math.ceil(total / limit),
    } as IPaginationMetadatum,
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.max(1, Math.ceil(total / limit)),
  } satisfies IPage.IPagination;
  return {
    data: [overview],
    pagination,
  } satisfies IPageIRedditCommunityReportsOverview;
}
function buildOrderBy(
  body: IRedditCommunityReportsOverviewRequest,
): Prisma.reddit_community_reportsOrderByWithRelationInput {
  const sortBy = body.sortBy ?? "createdAt";
  const sortOrder = body.sortOrder ?? "asc";
  const orderByMap: Record<
    string,
    Prisma.reddit_community_reportsOrderByWithRelationInput
  > = {
    createdAt: { created_at: sortOrder },
    statusId: { status_id: sortOrder },
    reporterId: { reporter_id: sortOrder },
  };
  return orderByMap[sortBy];
}
async function computeStatistics(
  whereInput: Prisma.reddit_community_reportsWhereInput,
): Promise<IRedditCommunityReportsOverviewStatistic> {
  const reports = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    select: { created_at: true },
  });
  const oldestReportDate =
    reports.length > 0
      ? reports
          .reduce(
            (min, r) => (r.created_at < min ? r.created_at : min),
            reports[0].created_at,
          )
          .toISOString()
      : undefined;
  const newestReportDate =
    reports.length > 0
      ? reports
          .reduce(
            (max, r) => (r.created_at > max ? r.created_at : max),
            reports[0].created_at,
          )
          .toISOString()
      : undefined;
  return {
    totalPendingCount: reports.length,
    oldestReportDate: oldestReportDate ?? null,
    newestReportDate: newestReportDate ?? null,
  } satisfies IRedditCommunityReportsOverviewStatistic;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCommunityReportsOverviewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewRequest";
// import { IPageIRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportsOverview";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
// import { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
// import { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// import { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminReportsOverview(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityReportsOverviewRequest;
// }): Promise<IPageIRedditCommunityReportsOverview> {
//   const records = await MyGlobal.prisma.reddit_community_reports.findMany({
//     ...RedditCommunityReportsOverviewTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityReportsOverviewTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------