import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityReportAtSummaryTransformer } from "../transformers/RedditCloneCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdModerationQueue(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityReport.IRequest;
}): Promise<IPageIRedditCloneCommunityReport.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Verify member is moderator or owner of the community
  const moderator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with filters
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.targetType !== undefined && {
      target_type: props.body.targetType,
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.reddit_clone_community_reportsWhereInput;
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // OrderBy: oldest first (ascending by created_at)
  const orderByInput = {
    created_at: "asc" as const,
  } satisfies Prisma.reddit_clone_community_reportsOrderByWithRelationInput;
  // Query reports with transformer select
  const records = await MyGlobal.prisma.reddit_clone_community_reports.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityReportAtSummaryTransformer.select(),
    },
  );
  // Count total records for pagination
  const total = await MyGlobal.prisma.reddit_clone_community_reports.count({
    where: whereInput,
  });
  // Calculate total pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  // Build response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommunityReportAtSummaryTransformer.transform,
    ),
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
// import { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
// import { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberCommunitiesCommunityIdModerationQueue(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityReport.IRequest;
// }): Promise<IPageIRedditCloneCommunityReport.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_community_reports.findMany({
//     ...RedditCloneCommunityReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneCommunityReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------