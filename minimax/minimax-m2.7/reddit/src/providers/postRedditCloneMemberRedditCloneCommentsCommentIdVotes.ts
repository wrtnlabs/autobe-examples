import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote.IUpsert> {
  // Validate comment exists and is not soft-deleted
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        vote_score: true,
        deleted_at: true,
      },
    },
  );
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot vote on deleted comment", 400);
  }
  const commentAuthorId = comment.reddit_clone_member_id;
  const newDirection = props.body.direction;
  const isNewUpvote = newDirection === "upvote";
  // Execute vote operation atomically
  const voteRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check for existing vote on this comment
    // Using reddit_clone_post_votes table where reddit_clone_post_id references the comment
    const existingVote = await tx.reddit_clone_post_votes.findUnique({
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.commentId,
        },
      },
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: {
          select: { id: true, username: true },
        },
      },
    });
    if (!existingVote) {
      // No existing vote - create new vote and adjust scores by 1
      const scoreDelta = isNewUpvote ? 1 : -1;
      const karmaDelta = scoreDelta;
      // Update comment vote score
      await tx.reddit_clone_comments.update({
        where: { id: props.commentId },
        data: { vote_score: { increment: scoreDelta } },
      });
      // Update or create comment author's karma
      await tx.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: commentAuthorId },
        update: {
          karma_score: { increment: karmaDelta },
          updated_at: new Date(),
        },
        create: {
          id: v4(),
          reddit_clone_member_id: commentAuthorId,
          karma_score: karmaDelta,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      // Create new vote record
      const newVote = await tx.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.commentId,
          direction: newDirection,
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: {
          id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          member: {
            select: { id: true, username: true },
          },
        },
      });
      return newVote;
    }
    // Existing vote found
    if (existingVote.direction === newDirection) {
      // Same direction - no changes needed, return existing
      return existingVote;
    }
    // Different direction - update vote and adjust scores by 2
    const scoreDelta = isNewUpvote ? 2 : -2;
    const karmaDelta = scoreDelta;
    // Update comment vote score (removing old effect + adding new effect)
    await tx.reddit_clone_comments.update({
      where: { id: props.commentId },
      data: { vote_score: { increment: scoreDelta } },
    });
    // Update comment author's karma by 2
    await tx.reddit_clone_user_karmas.upsert({
      where: { reddit_clone_member_id: commentAuthorId },
      update: {
        karma_score: { increment: karmaDelta },
        updated_at: new Date(),
      },
      create: {
        id: v4(),
        reddit_clone_member_id: commentAuthorId,
        karma_score: karmaDelta,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Update existing vote direction
    const updatedVote = await tx.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: { direction: newDirection, updated_at: new Date() },
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: {
          select: { id: true, username: true },
        },
      },
    });
    return updatedVote;
  });
  // Get final comment vote score for response
  const finalComment =
    await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { vote_score: true },
    });
  // Build member summary
  const memberSummary: IRedditCloneMember.ISummary = {
    id: voteRecord.member.id,
    username: voteRecord.member.username,
  } satisfies IRedditCloneMember.ISummary;
  return {
    id: voteRecord.id,
    direction: voteRecord.direction,
    createdAt: toISOStringSafe(voteRecord.created_at),
    updatedAt: toISOStringSafe(voteRecord.updated_at),
    member: memberSummary,
    commentVoteScore: finalComment.vote_score,
  } satisfies IRedditClonePostVote.IUpsert;
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.ICreate;
// }): Promise<IRedditClonePostVote.IUpsert> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.create({
//     data: await RedditClonePostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditClonePostVoteAtUpsertTransformer.select(),
//   });
//   return await RedditClonePostVoteAtUpsertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------