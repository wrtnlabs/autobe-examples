import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  // Find the vote by voteId
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: props.voteId },
    select: {
      id: true,
      direction: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
    },
  });
  // Find the comment to get its associated post
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_post_id: true,
      },
    },
  );
  // Verify vote belongs to this comment's post
  if (vote.reddit_clone_post_id !== comment.reddit_clone_post_id) {
    throw new HttpException("Vote not found for this comment", 404);
  }
  // Validate the authenticated member owns the vote
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update vote direction
  await MyGlobal.prisma.reddit_clone_post_votes.update({
    where: { id: props.voteId },
    data: {
      direction: props.body.direction,
      updated_at: new Date(),
    },
  });
  // Recalculate vote_score by summing all vote directions for the post
  const allVotes = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
    where: { reddit_clone_post_id: comment.reddit_clone_post_id },
    select: { direction: true },
  });
  const totalScore = allVotes.reduce((sum, v) => {
    return sum + (v.direction === "upvote" ? 1 : -1);
  }, 0);
  // Update the comment's vote_score
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      vote_score: totalScore,
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated vote
  const updated =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...RedditClonePostVoteTransformer.select(),
    });
  return await RedditClonePostVoteTransformer.transform(updated);
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
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.IUpdate;
// }): Promise<IRedditClonePostVote> {
//   await MyGlobal.prisma.reddit_clone_post_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostVoteTransformer.select(),
//   });
//   return await RedditClonePostVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------