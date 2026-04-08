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
  const sort = props.body.sort ?? "Best";
  const limit = (props.body.limit ?? 20) > 100 ? 20 : (props.body.limit ?? 20);
  const page = (props.body.page ?? 1) < 1 ? 1 : (props.body.page ?? 1);
  // Build orderBy based on sort parameter
  const orderBy = (() => {
    switch (sort) {
      case "Best":
        return [
          { vote_score: "desc" },
          { created_at: "desc" },
        ] as Prisma.reddit_clone_commentsOrderByWithRelationInput[];
      case "New":
        return {
          created_at: "desc",
        } as Prisma.reddit_clone_commentsOrderByWithRelationInput;
      case "Controversial":
        return [
          { vote_score: "asc" },
          { created_at: "desc" },
        ] as Prisma.reddit_clone_commentsOrderByWithRelationInput[];
    }
  })();
  // Cursor-based pagination
  let skip: number | undefined;
  let whereClause: Prisma.reddit_clone_commentsWhereInput = {
    parent_comment_id: props.commentId,
    deleted_at: null,
  };
  if (props.body.cursorId && props.body.cursorCreatedAt) {
    const cursorCreatedAt = new Date(props.body.cursorCreatedAt);
    whereClause = {
      ...whereClause,
      OR: [
        { created_at: { gt: cursorCreatedAt } },
        {
          created_at: cursorCreatedAt,
          id: { gt: props.body.cursorId },
        },
      ],
    };
  } else {
    skip = (page - 1) * limit;
  }
  // Fetch more records for Controversial sorting to filter by ABS(vote_score)
  const takeCount = sort === "Controversial" ? limit * 3 : limit;
  const records = await MyGlobal.prisma.reddit_clone_comments.findMany({
    ...RedditCloneCommentAtSummaryTransformer.select(),
    where: whereClause,
    orderBy,
    skip,
    take: takeCount,
  });
  // For Controversial sort, filter by ABS(vote_score) - controversial means low absolute score
  let filteredRecords = records;
  if (sort === "Controversial") {
    filteredRecords = records
      .filter((r) => Math.abs(r.vote_score) <= 50) // threshold for controversial
      .sort((a, b) => Math.abs(a.vote_score) - Math.abs(b.vote_score))
      .slice(0, limit);
  }
  const total = await MyGlobal.prisma.reddit_clone_comments.count({
    where: { parent_comment_id: props.commentId, deleted_at: null },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await RedditCloneCommentAtSummaryTransformer.transformAll(
      filteredRecords,
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