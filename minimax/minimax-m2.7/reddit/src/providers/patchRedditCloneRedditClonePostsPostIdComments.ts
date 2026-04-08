import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentAtSummaryTransformer } from "../transformers/RedditCloneCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneRedditClonePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  // Validate post exists
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const sort = props.body.sort ?? "Best";
  const limit = Math.min(props.body.limit ?? 20, 100);
  const page = props.body.page ?? 1;
  // Build orderBy based on sort parameter
  const getOrderBy =
    (): Prisma.reddit_clone_commentsOrderByWithRelationInput[] => {
      switch (sort) {
        case "Best":
          return [{ vote_score: "desc" }, { created_at: "desc" }];
        case "New":
          return [{ created_at: "desc" }];
        case "Controversial":
          // For controversial: lowest absolute score first, then by vote_score, then by created_at
          // We need to use raw query approach by sorting in memory after fetching
          return [{ vote_score: "asc" }, { created_at: "desc" }];
        default:
          return [{ vote_score: "desc" }, { created_at: "desc" }];
      }
    };
  // Offset-based pagination (page/limit)
  const skip = (page - 1) * limit;
  // Build where clause for top-level comments
  const where = {
    reddit_clone_post_id: props.postId,
    parent_comment_id: null,
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  // Query top-level comments
  const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
    ...RedditCloneCommentAtSummaryTransformer.select(),
    where,
    orderBy: getOrderBy(),
    skip,
    take: limit,
  });
  // Sort by absolute vote_score for Controversial after fetch
  let sortedRecords = records;
  if (sort === "Controversial") {
    sortedRecords = [...records].sort((a, b) => {
      const absA = Math.abs(a.vote_score);
      const absB = Math.abs(b.vote_score);
      if (absA !== absB) return absA - absB;
      if (a.vote_score !== b.vote_score) return a.vote_score - b.vote_score;
      return b.created_at.getTime() - a.created_at.getTime();
    });
  }
  // Count total top-level comments for pagination
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: {
      reddit_clone_post_id: props.postId,
      parent_comment_id: null,
    },
  });
  // Transform with nested replies using transformAll
  const data =
    await RedditCloneCommentAtSummaryTransformer.transformAll(sortedRecords);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
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
// import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
// import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneRedditClonePostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCloneComment.IRequest;
// }): Promise<IPageIRedditCloneComment.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
//     ...RedditCloneCommentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await RedditCloneCommentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------