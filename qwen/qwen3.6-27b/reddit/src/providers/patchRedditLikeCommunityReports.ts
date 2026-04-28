import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityReportAtSummaryTransformer } from "../transformers/REdditLikeCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityReports(props: {
  body: IREdditLikeCommunityReport.IRequest;
}): Promise<IPageIRedditLikeCommunityReport.ISummary> {
  const { body } = props;
  const where: Prisma.reddit_like_community_reportsWhereInput = {
    deleted_at: null,
    ...(body.communityId && { communityId: body.communityId }),
    ...(body.reporterId && { reporterId: body.reporterId }),
    ...(body.resolvedByModeratorId !== undefined && {
      resolvedById: body.resolvedByModeratorId!,
    }),
    ...(body.targetType && { targetType: body.targetType }),
    ...(body.status && { status: body.status }),
    ...(body.reason && { reason: { contains: body.reason } }),
    ...(body.createdFrom && {
      created_at: { gte: new Date(body.createdFrom) },
    }),
    ...(body.createdTo && {
      created_at: { lte: new Date(body.createdTo) },
    }),
    ...(body.resolvedFrom && {
      resolved_at: {
        gte: new Date(body.resolvedFrom),
      },
    }),
    ...(body.resolvedTo && {
      resolved_at: {
        lte: new Date(body.resolvedTo),
      },
    }),
  } satisfies Prisma.reddit_like_community_reportsWhereInput;
  let skip = 0;
  if (body.page && body.page > 1) {
    skip = (body.page - 1) * (body.limit || 20);
  }
  const reports = await MyGlobal.prisma.reddit_like_community_reports.findMany({
    where,
    skip,
    take: body.limit || 20,
    orderBy: (body.sortBy === "oldest"
      ? { created_at: "asc" }
      : body.sortBy === "status"
        ? { status: "asc", created_at: "asc" }
        : {
            created_at: "desc",
          }) satisfies Prisma.reddit_like_community_reportsOrderByWithRelationInput as Prisma.reddit_like_community_reportsOrderByWithRelationInput,
    ...REdditLikeCommunityReportAtSummaryTransformer.select(),
  });
  const pagination = await MyGlobal.prisma.reddit_like_community_reports.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      reports,
      REdditLikeCommunityReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: body.page || 1,
      limit: body.limit || 20,
      records: pagination,
      pages: Math.ceil(pagination / (body.limit || 20)),
    } satisfies IPage.IPagination,
  };
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
// import { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
// import { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityReports(props: {
//   body: IREdditLikeCommunityReport.IRequest;
// }): Promise<IPageIRedditLikeCommunityReport.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityReportAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------