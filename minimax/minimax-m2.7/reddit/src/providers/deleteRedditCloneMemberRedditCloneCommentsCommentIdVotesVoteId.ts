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
  // 1. Find the vote record
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      direction: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
    },
  });
  // 2. Verify vote belongs to the specified comment
  // The vote references a post, so we need to find the comment's post
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
      },
    },
  );
  // The vote's post_id must match the comment's post_id
  if (vote.reddit_clone_post_id !== comment.reddit_clone_post_id) {
    throw new HttpException("Vote not found for this comment", 404);
  }
  // 3. Verify ownership - only the vote author can remove their vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Adjust comment author's karma based on vote direction
  const karmaDelta = vote.direction === "upvote" ? 1 : -1;
  const commentAuthorId = comment.reddit_clone_member_id;
  // Update the comment author's karma
  await MyGlobal.prisma.reddit_clone_user_karmas.update({
    where: { reddit_clone_member_id: commentAuthorId },
    data: {
      karma_score: { increment: karmaDelta },
      updated_at: new Date(),
    },
  });
  // 5. Delete the vote record
  await MyGlobal.prisma.reddit_clone_post_votes.delete({
    where: { id: props.voteId },
  });
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