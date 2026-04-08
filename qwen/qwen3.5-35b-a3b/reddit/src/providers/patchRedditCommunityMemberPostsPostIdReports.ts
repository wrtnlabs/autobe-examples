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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: { id: props.postId },
    select: { id: true, community: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.member.id,
        reddit_community_community_id: post.community.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const statusFilter: Prisma.IntFilter | undefined =
    props.body.status_id !== undefined
      ? { equals: parseInt(props.body.status_id, 10) as number }
      : undefined;
  const reporterFilter: Prisma.StringFilter | undefined =
    props.body.reporter_id !== undefined
      ? { equals: props.body.reporter_id }
      : undefined;
  const dateFilter: Prisma.reddit_community_reportsWhereInput | undefined =
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
      ? {
          created_at: {
            ...(props.body.created_after !== undefined && {
              gt: props.body.created_after,
            }),
            ...(props.body.created_before !== undefined && {
              lt: props.body.created_before,
            }),
          },
        }
      : undefined;
  const baseWhere: Prisma.reddit_community_reportsWhereInput = {
    target_post_id: props.postId,
    deleted_at: null,
    ...(statusFilter !== undefined && { status_id: statusFilter }),
    ...(reporterFilter !== undefined && { reporter_id: reporterFilter }),
    ...(dateFilter !== undefined && dateFilter),
  };
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: baseWhere,
    skip,
    take: limit,
    orderBy: [{ status_id: "asc" as const }, { created_at: "desc" as const }],
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: baseWhere,
  });
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
// export async function patchRedditCommunityMemberPostsPostIdReports(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
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