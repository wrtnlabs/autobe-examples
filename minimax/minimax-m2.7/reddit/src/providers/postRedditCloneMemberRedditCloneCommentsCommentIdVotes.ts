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
  // 1. Validate comment exists and is not soft-deleted
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
  // 2. Check if vote already exists for this member and comment
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_member_id: props.member.id,
      reddit_clone_post_id: props.commentId,
    },
  });
  // 3. Handle vote logic based on existing state
  if (!existingVote) {
    // No existing vote: create new vote and adjust comment score by ±1
    const delta = props.body.direction === "upvote" ? 1 : -1;
    const voteId = v4();
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_clone_post_votes.create({
        data: {
          id: voteId,
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.commentId,
          direction: props.body.direction,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
      MyGlobal.prisma.reddit_clone_comments.update({
        where: { id: props.commentId },
        data: { vote_score: comment.vote_score + delta },
      }),
    ]);
    // Fetch created vote for response
    const createdVote =
      await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
        where: { id: voteId },
        select: {
          id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          reddit_clone_member_id: true,
        },
      });
    const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow(
      {
        where: { id: createdVote.reddit_clone_member_id },
        select: { id: true, username: true },
      },
    );
    const updatedComment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.commentId },
        select: { vote_score: true },
      });
    return {
      id: createdVote.id,
      direction: createdVote.direction,
      createdAt: toISOStringSafe(createdVote.created_at),
      updatedAt: toISOStringSafe(createdVote.updated_at),
      member: {
        id: member.id,
        username: member.username,
      } satisfies IRedditCloneMember.ISummary,
      commentVoteScore: updatedComment.vote_score,
    } satisfies IRedditClonePostVote.IUpsert;
  } else if (existingVote.direction === props.body.direction) {
    // Same direction: return existing vote without any changes
    const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow(
      {
        where: { id: existingVote.reddit_clone_member_id },
        select: { id: true, username: true },
      },
    );
    return {
      id: existingVote.id,
      direction: existingVote.direction,
      createdAt: toISOStringSafe(existingVote.created_at),
      updatedAt: toISOStringSafe(existingVote.updated_at),
      member: {
        id: member.id,
        username: member.username,
      } satisfies IRedditCloneMember.ISummary,
      commentVoteScore: comment.vote_score,
    } satisfies IRedditClonePostVote.IUpsert;
  } else {
    // Different direction: update vote and adjust comment score by ±2
    const delta = props.body.direction === "upvote" ? 2 : -2;
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: props.body.direction,
          updated_at: new Date(),
        },
      }),
      MyGlobal.prisma.reddit_clone_comments.update({
        where: { id: props.commentId },
        data: { vote_score: comment.vote_score + delta },
      }),
    ]);
    // Fetch updated vote for response
    const updatedVote =
      await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        select: {
          id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          reddit_clone_member_id: true,
        },
      });
    const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow(
      {
        where: { id: updatedVote.reddit_clone_member_id },
        select: { id: true, username: true },
      },
    );
    const finalComment =
      await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
        where: { id: props.commentId },
        select: { vote_score: true },
      });
    return {
      id: updatedVote.id,
      direction: updatedVote.direction,
      createdAt: toISOStringSafe(updatedVote.created_at),
      updatedAt: toISOStringSafe(updatedVote.updated_at),
      member: {
        id: member.id,
        username: member.username,
      } satisfies IRedditCloneMember.ISummary,
      commentVoteScore: finalComment.vote_score,
    } satisfies IRedditClonePostVote.IUpsert;
  }
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