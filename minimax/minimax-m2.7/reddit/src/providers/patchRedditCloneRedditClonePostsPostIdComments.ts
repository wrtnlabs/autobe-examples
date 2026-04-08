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
  // Validate post exists before querying comments
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Determine sort order
  const sortOrder = props.body.sort ?? "Best";
  const orderByInput = (
    sortOrder === "Best"
      ? [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
      : sortOrder === "New"
        ? [{ created_at: "desc" as const }]
        : sortOrder === "Controversial"
          ? [{ vote_score: "asc" as const }, { created_at: "desc" as const }]
          : [{ vote_score: "desc" as const }, { created_at: "desc" as const }]
  ) satisfies Prisma.reddit_clone_commentsOrderByWithRelationInput[];
  // Build where clause for top-level comments
  const whereInput = {
    reddit_clone_post_id: props.postId,
    parent_comment_id: null,
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  // Query comments with pagination
  const fetchMore = props.body.cursor ? 1 : 0;
  const comments = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: props.body.cursor ? undefined : skip,
    take: limit + fetchMore,
    ...RedditCloneCommentAtSummaryTransformer.select(),
  });
  // Apply cursor-based pagination filtering
  let paginatedComments = comments;
  if (props.body.cursor && props.body.cursorId && props.body.cursorCreatedAt) {
    const cursorDate = new Date(props.body.cursorCreatedAt);
    const cursorId = props.body.cursorId;
    paginatedComments = comments.filter((comment) => {
      const commentDate = comment.created_at;
      return (
        commentDate > cursorDate ||
        (commentDate.getTime() === cursorDate.getTime() &&
          comment.id > cursorId)
      );
    });
    // Limit to requested page size
    if (paginatedComments.length > limit) {
      paginatedComments = paginatedComments.slice(0, limit);
    }
  }
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: whereInput,
  });
  // Transform comments with nested replies
  const data =
    await RedditCloneCommentAtSummaryTransformer.transformAll(
      paginatedComments,
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditCloneComment.ISummary;
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