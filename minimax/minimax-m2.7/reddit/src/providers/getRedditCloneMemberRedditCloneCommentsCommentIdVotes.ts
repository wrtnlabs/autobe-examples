import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditClonePostVote.ISummary> {
  // Validate comment exists - throws 404 if not found
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  // Schema limitation: reddit_clone_post_votes only links to posts (reddit_clone_post_id).
  // There is no comment votes table or foreign key to comments.
  // Comment voting is not implemented in the current database schema.
  // The denormalized vote_score exists on reddit_clone_comments but provides
  // only aggregate data, not individual vote records with voter information.
  // Return empty paginated result since comment-level vote records cannot be queried.
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data: [],
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
// import { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IPageIRedditClonePostVote.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
//     ...RedditClonePostVoteAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditClonePostVoteAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------