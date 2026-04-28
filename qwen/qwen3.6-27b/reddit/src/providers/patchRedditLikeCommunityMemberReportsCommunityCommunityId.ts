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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityReportAtSummaryTransformer } from "../transformers/REdditLikeCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityMemberReportsCommunityCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityReport.IRequest;
}): Promise<IPageIRedditLikeCommunityReport.ISummary> {
  // Authorization: verify active moderator role in this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        reddit_like_community_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // Pagination parameters
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const page = Math.max(props.body.page ?? 1, 1);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    reddit_like_community_community_id: props.communityId,
    status: "pending",
    deleted_at: null,
    ...(props.body.reporterId !== undefined && props.body.reporterId !== null
      ? { reported_by_member_id: props.body.reporterId }
      : {}),
    ...(props.body.targetType !== undefined && props.body.targetType !== null
      ? { target_type: props.body.targetType }
      : {}),
    ...(props.body.reason !== undefined &&
    props.body.reason !== null &&
    props.body.reason.length > 0
      ? { reason: { contains: props.body.reason } }
      : {}),
    ...(props.body.createdFrom !== undefined && props.body.createdFrom !== null
      ? { created_at: { gte: new Date(props.body.createdFrom) } }
      : {}),
    ...(props.body.createdTo !== undefined && props.body.createdTo !== null
      ? { created_at: { lte: new Date(props.body.createdTo) } }
      : {}),
  } satisfies Prisma.reddit_like_community_reportsWhereInput;
  // Build ORDER BY clause
  const orderBy =
    props.body.sortBy === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sortBy === "status"
        ? { status: "asc" as const, created_at: "asc" as const }
        : { created_at: "desc" as const };
  // Fetch paginated records
  const data = await MyGlobal.prisma.reddit_like_community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...REdditLikeCommunityReportAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.reddit_like_community_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(data, (r) =>
      REdditLikeCommunityReportAtSummaryTransformer.transform(r),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// export async function patchRedditLikeCommunityMemberReportsCommunityCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityReport.IRequest;
// }): Promise<IPageIRedditLikeCommunityReport.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityReportAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------