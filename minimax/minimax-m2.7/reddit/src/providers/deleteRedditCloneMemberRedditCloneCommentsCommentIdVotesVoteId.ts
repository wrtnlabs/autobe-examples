import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_clone_post_id: true,
      reddit_clone_member_id: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Not Found", 404);
  }
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
      direction: true,
    },
  });
  if (vote === null) {
    throw new HttpException("Not Found", 404);
  }
  if (vote.reddit_clone_post_id !== comment.reddit_clone_post_id) {
    throw new HttpException("Not Found", 404);
  }
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const karmaIncrement = vote.direction === "upvote" ? 1 : -1;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: comment.reddit_clone_member_id },
      data: { karma_score: { increment: karmaIncrement } },
    }),
    MyGlobal.prisma.reddit_clone_post_votes.delete({
      where: { id: props.voteId },
    }),
  ]);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------