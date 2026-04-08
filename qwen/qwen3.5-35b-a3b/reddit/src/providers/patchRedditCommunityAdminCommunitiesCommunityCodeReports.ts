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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminCommunitiesCommunityCodeReports(props: {
  admin: AdminPayload;
  communityCode: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityCode },
      select: { id: true, deleted_at: true },
    });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_member_id: props.admin.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const bannedMembers =
    await MyGlobal.prisma.reddit_community_ban_records.findMany({
      where: {
        community_id: community.id,
        deleted_at: null,
      },
      select: { user_id: true },
    });
  const bannedMemberIds = bannedMembers.map((b) => b.user_id);
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    community_id: community.id,
    status_id: 0,
    deleted_at: null,
    ...(bannedMemberIds.length > 0
      ? { reporter_id: { notIn: bannedMemberIds } }
      : {}),
    ...(props.body.created_after
      ? { created_at: { gt: new Date(props.body.created_after) } }
      : {}),
    ...(props.body.created_before
      ? { created_at: { lt: new Date(props.body.created_before) } }
      : {}),
  } satisfies Prisma.reddit_community_reportsWhereInput;
  const orderByInput = (
    props.body.sort === "reporter_id"
      ? { reporter_id: "asc" as const }
      : {
          created_at: "desc" as const,
        }
  ) satisfies Prisma.reddit_community_reportsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityReport.ISummary;
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
// import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
// import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminCommunitiesCommunityCodeReports(props: {
//   admin: AdminPayload;
//   communityCode: string;
//   body: IRedditCommunityReport.IRequest;
// }): Promise<IPageIRedditCommunityReport.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_reports.findMany({
//     ...RedditCommunityReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------