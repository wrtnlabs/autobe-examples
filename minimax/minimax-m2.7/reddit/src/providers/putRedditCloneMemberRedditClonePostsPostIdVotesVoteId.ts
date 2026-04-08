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

export async function putRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote;
}): Promise<IRedditClonePostVote> {
  // 1. Find the existing vote
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: { id: props.voteId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        direction: true,
      },
    },
  );
  // 2. Verify vote exists
  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }
  // 3. Verify vote belongs to authenticated member
  if (existingVote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      vote_score: true,
      deleted_at: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // 5. Calculate score adjustment based on direction change
  const currentDirection = existingVote.direction;
  const newDirection = props.body.direction;
  let scoreAdjustment: number;
  if (currentDirection === newDirection) {
    scoreAdjustment = 0;
  } else if (currentDirection === "upvote" && newDirection === "downvote") {
    scoreAdjustment = -2;
  } else if (currentDirection === "downvote" && newDirection === "upvote") {
    scoreAdjustment = 2;
  } else {
    scoreAdjustment = 0;
  }
  // 6. Use Date object for Prisma (required at runtime), store ISO string for reference
  const nowString = new Date().toISOString();
  const nowDate = new Date();
  // 7. Execute transaction to atomically update vote, post score, and author karma
  const updatedVote = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the vote record
    const vote = await tx.reddit_clone_post_votes.update({
      where: { id: props.voteId },
      data: {
        direction: newDirection,
        updated_at: nowDate,
      },
      ...RedditClonePostVoteTransformer.select(),
    });
    // Update post score and author karma if direction changed
    if (scoreAdjustment !== 0) {
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: scoreAdjustment },
          updated_at: nowDate,
        },
      });
      const existingKarma = await tx.reddit_clone_user_karmas.findUnique({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
      });
      if (existingKarma) {
        await tx.reddit_clone_user_karmas.update({
          where: { reddit_clone_member_id: post.reddit_clone_member_id },
          data: {
            karma_score: { increment: scoreAdjustment },
            updated_at: nowDate,
          },
        });
      } else {
        const karmaId = typia.assert<string & tags.Format<"uuid">>(v4());
        await tx.reddit_clone_user_karmas.create({
          data: {
            id: karmaId,
            reddit_clone_member_id: post.reddit_clone_member_id,
            karma_score: scoreAdjustment,
            created_at: nowDate,
            updated_at: nowDate,
          },
        });
      }
    }
    return vote;
  });
  return await RedditClonePostVoteTransformer.transform(updatedVote);
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
// export async function putRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote;
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