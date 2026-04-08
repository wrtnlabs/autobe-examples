import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentAtSummaryTransformer } from "../transformers/RedditPlatformCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsPostIdCommentsSort(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformComment.ISortRequest;
}): Promise<IPageIRedditPlatformComment.ISummary> {
  // Validate post existence
  await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Determine sort order (default to 'best')
  const sortOrder: "best" | "new" | "controversial" =
    props.body.sort === "best" ||
    props.body.sort === "new" ||
    props.body.sort === "controversial"
      ? props.body.sort
      : "best";
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Calculate skip
  const skip = (page - 1) * limit;
  // Fetch all comments for the post (deleted comments filtered out)
  const allComments = await MyGlobal.prisma.reddit_platform_comments.findMany({
    ...RedditPlatformCommentAtSummaryTransformer.select(),
    where: {
      reddit_platform_post_id: props.postId,
      deleted_at: null,
    },
  });
  // Filter and sort based on sortOrder
  let sortedComments: IRedditPlatformComment.ISummary[];
  if (sortOrder === "controversial") {
    // Filter by total votes >= 5, then sort by absolute score ascending
    const filteredComments = allComments.filter(
      (c) => c.upvotes_count + c.downvotes_count >= 5,
    );
    sortedComments =
      await RedditPlatformCommentAtSummaryTransformer.transformAll(
        filteredComments,
      );
    // Sort by absolute score ascending (controversial = score close to zero)
    sortedComments.sort((a, b) => {
      const absScoreA = Math.abs(a.score);
      const absScoreB = Math.abs(b.score);
      if (absScoreA !== absScoreB) {
        return absScoreA - absScoreB;
      }
      // Tie-breaker: total votes descending
      const totalVotesA = a.upvotes_count + a.downvotes_count;
      const totalVotesB = b.upvotes_count + b.downvotes_count;
      return totalVotesB - totalVotesA;
    });
  } else if (sortOrder === "best") {
    sortedComments =
      await RedditPlatformCommentAtSummaryTransformer.transformAll(allComments);
    // Sort by score descending, then created_at ascending (older ties first)
    sortedComments.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      // Compare timestamps as strings
      return a.created_at.localeCompare(b.created_at);
    });
  } else {
    // sortOrder === "new"
    sortedComments =
      await RedditPlatformCommentAtSummaryTransformer.transformAll(allComments);
    // Sort by created_at descending (newest first)
    sortedComments.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  // Apply pagination
  const paginatedComments = sortedComments.slice(skip, skip + limit);
  // Fetch total count for pagination metadata (total before filtering for controversial)
  const total = allComments.length;
  // Return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedComments,
  } satisfies IPageIRedditPlatformComment.ISummary;
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberPostsPostIdCommentsSort(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditPlatformComment.ISortRequest;
// }): Promise<IPageIRedditPlatformComment.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_comments.findMany({
//     ...RedditPlatformCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await RedditPlatformCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------