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

export async function deleteRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the vote record
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
      direction: true,
    },
  });
  // Verify the authenticated user owns this vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify postId matches the vote's associated post
  if (vote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Bad Request", 400);
  }
  // Determine adjustment direction based on vote type
  const isUpvote = vote.direction === "upvote";
  const adjustment = isUpvote ? -1 : 1;
  // Find the post to get the author ID
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
    },
  });
  // Perform all operations in a transaction
  await MyGlobal.prisma.$transaction([
    // Update post vote_score
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: adjustment },
      },
    }),
    // Update author's karma
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      data: {
        karma_score: { increment: adjustment },
      },
    }),
    // Delete the vote
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
// export async function deleteRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------