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

export async function patchRedditCloneRedditCloneCommentsCommentIdReplies(props: {
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  // Validate parent comment exists
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build orderBy based on sort parameter
  const orderBy = ((): Prisma.reddit_clone_commentsOrderByWithRelationInput => {
    if (props.body.sort === "New") {
      return { created_at: "desc" };
    }
    if (props.body.sort === "Controversial") {
      return { vote_score: "asc" };
    }
    // Default to Best (vote_score DESC)
    return { vote_score: "desc" };
  })();
  // Cursor-based pagination where clause for forward pagination
  const cursorWhere =
    props.body.cursorId && props.body.cursorCreatedAt
      ? {
          OR: [
            { created_at: { gt: new Date(props.body.cursorCreatedAt) } },
            {
              AND: [
                {
                  created_at: { equals: new Date(props.body.cursorCreatedAt) },
                },
                { id: { gt: props.body.cursorId } },
              ],
            },
          ],
        }
      : undefined;
  // Query replies
  const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
    ...RedditCloneCommentAtSummaryTransformer.select(),
    where: {
      parent_comment_id: props.commentId,
      ...cursorWhere,
    },
    orderBy,
    take: limit,
    skip: props.body.cursorId ? 0 : skip,
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: { parent_comment_id: props.commentId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await RedditCloneCommentAtSummaryTransformer.transformAll(records),
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
// export async function patchRedditCloneRedditCloneCommentsCommentIdReplies(props: {
//   commentId: string & tags.Format<"uuid">;
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