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

export async function patchRedditCommunityAdminPostsPostIdCommentsCommentIdReports(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  // Validate comment exists and belongs to the given postId
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, reddit_community_post_id: true, deleted_at: true },
    });
  // Verify comment belongs to the given post
  if (comment.reddit_community_post_id !== props.postId) {
    throw new HttpException("Comment does not belong to this post", 400);
  }
  // If comment is soft-deleted, return empty list (reports may still exist)
  if (comment.deleted_at !== null) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Build filters from request body
  const whereFilters: Prisma.reddit_community_reportsWhereInput = {
    target_comment_id: props.commentId,
    deleted_at: null,
  };
  // Apply status filter (convert string to int)
  if (props.body.status_id) {
    const statusId = parseInt(props.body.status_id, 10);
    if (Number.isNaN(statusId) || statusId < 0 || statusId > 2) {
      throw new HttpException("Invalid status_id value", 400);
    }
    whereFilters.status_id = statusId;
  }
  // Apply reporter filter
  if (props.body.reporter_id) {
    whereFilters.reporter_id = props.body.reporter_id;
  }
  // Apply date range filters
  if (props.body.created_after) {
    whereFilters.created_at = { gt: new Date(props.body.created_after) };
  }
  if (props.body.created_before) {
    if (typeof whereFilters.created_at !== "object") {
      whereFilters.created_at = {};
    }
    (
      whereFilters.created_at as Prisma.DateTimeFilter<"reddit_community_reports">
    ).lt = new Date(props.body.created_before);
  }
  // Build orderBy with default sort
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput =
    {
      created_at: "desc" as const,
    };
  if (props.body.sort) {
    switch (props.body.sort) {
      case "created_at":
        orderByInput.created_at = "desc" as const;
        break;
      case "updated_at":
        orderByInput.updated_at = "desc" as const;
        break;
      case "status_id":
        orderByInput.status_id = "asc" as const;
        break;
      case "reporter_id":
        orderByInput.reporter_id = "asc" as const;
        break;
    }
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereFilters,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_reports.count({
      where: whereFilters,
    }),
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
// export async function patchRedditCommunityAdminPostsPostIdCommentsCommentIdReports(props: {
//   admin: AdminPayload;
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