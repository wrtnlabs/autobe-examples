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

export async function patchRedditCommunityMemberPostsPostIdCommentsCommentIdReports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_community_post_id: true,
      deleted_at: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    target_comment_id: props.commentId,
    deleted_at: null,
  };
  const filterConditions: {
    status_id?: number;
    reporter_id?: string & tags.Format<"uuid">;
    created_at?: Prisma.DateTimeFilter;
  } = {};
  if (props.body.status_id !== undefined) {
    filterConditions.status_id = parseInt(props.body.status_id, 10);
  }
  if (props.body.reporter_id !== undefined) {
    filterConditions.reporter_id = props.body.reporter_id;
  }
  const dateFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_after !== undefined) {
    dateFilter.gt = new Date(props.body.created_after);
  }
  if (props.body.created_before !== undefined) {
    dateFilter.lt = new Date(props.body.created_before);
  }
  if (Object.keys(dateFilter).length > 0) {
    filterConditions.created_at = dateFilter;
  }
  Object.assign(whereInput, filterConditions);
  let orderByConditions: Prisma.reddit_community_reportsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "status_id":
      orderByConditions = { status_id: "asc" };
      break;
    case "updated_at":
      orderByConditions = { updated_at: "desc" };
      break;
    case "reporter_id":
      orderByConditions = { reporter_id: "asc" };
      break;
    default:
      orderByConditions = { created_at: "desc" };
  }
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    ...RedditCommunityReportAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByConditions,
  });
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
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
// export async function patchRedditCommunityMemberPostsPostIdCommentsCommentIdReports(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   commentId: string & tags.Format<"uuid">;
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