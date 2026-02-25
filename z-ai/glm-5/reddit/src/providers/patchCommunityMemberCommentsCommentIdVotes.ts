import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentAtScoreTransformer } from "../transformers/CommunityCommentAtScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string;
  body: ICommunityCommentVote.IUpdate;
}): Promise<ICommunityComment.IScore> {
  // Find the comment with post relation to get community_id for ban check
  const comment = await MyGlobal.prisma.community_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      community_member_id: true,
      is_deleted: true,
      vote_score: true,
      upvote_count: true,
      downvote_count: true,
      post: {
        select: {
          community_id: true,
        },
      },
    },
  });
  // Check if comment is deleted
  if (comment.is_deleted) {
    throw new HttpException("Cannot vote on deleted comment", 400);
  }
  // Check self-voting prevention
  if (comment.community_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Check if user is banned from the community
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: {
      community_id_member_id: {
        community_id: comment.post.community_id,
        member_id: props.member.id,
      },
    },
  });
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Find existing vote
  const existingVote = await MyGlobal.prisma.community_comment_votes.findUnique(
    {
      where: {
        community_member_id_community_comment_id: {
          community_member_id: props.member.id,
          community_comment_id: props.commentId,
        },
      },
    },
  );
  const now = new Date();
  const voteDirection = props.body.vote === 1;
  // Handle vote removal (vote=0)
  if (props.body.vote === 0) {
    if (existingVote === null) {
      // No existing vote, nothing to remove - return current state
      return {
        vote_score: comment.vote_score,
        upvote_count: comment.upvote_count,
        downvote_count: comment.downvote_count,
      };
    }
    // Calculate deltas for removing vote
    const scoreDelta = existingVote.direction ? -1 : 1;
    const upvoteDelta = existingVote.direction ? -1 : 0;
    const downvoteDelta = existingVote.direction ? 0 : -1;
    // Delete the vote record
    await MyGlobal.prisma.community_comment_votes.delete({
      where: { id: existingVote.id },
    });
    // Update comment vote metrics
    const updated = await MyGlobal.prisma.community_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: comment.vote_score + scoreDelta,
        upvote_count: comment.upvote_count + upvoteDelta,
        downvote_count: comment.downvote_count + downvoteDelta,
        updated_at: now,
      },
      ...CommunityCommentAtScoreTransformer.select(),
    });
    // Update author karma
    await MyGlobal.prisma.community_members.update({
      where: { id: comment.community_member_id },
      data: {
        karma: { increment: scoreDelta },
        updated_at: now,
      },
    });
    return await CommunityCommentAtScoreTransformer.transform(updated);
  }
  // Handle upvote or downvote (vote=1 or -1)
  if (existingVote === null) {
    // Create new vote
    await MyGlobal.prisma.community_comment_votes.create({
      data: {
        id: v4(),
        community_comment_id: props.commentId,
        community_member_id: props.member.id,
        direction: voteDirection,
        created_at: now,
        updated_at: now,
      },
    });
    const scoreDelta = props.body.vote;
    const upvoteDelta = props.body.vote === 1 ? 1 : 0;
    const downvoteDelta = props.body.vote === -1 ? 1 : 0;
    // Update comment vote metrics
    const updated = await MyGlobal.prisma.community_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: comment.vote_score + scoreDelta,
        upvote_count: comment.upvote_count + upvoteDelta,
        downvote_count: comment.downvote_count + downvoteDelta,
        updated_at: now,
      },
      ...CommunityCommentAtScoreTransformer.select(),
    });
    // Update author karma
    await MyGlobal.prisma.community_members.update({
      where: { id: comment.community_member_id },
      data: {
        karma: { increment: scoreDelta },
        updated_at: now,
      },
    });
    return await CommunityCommentAtScoreTransformer.transform(updated);
  }
  // Existing vote exists - check if same direction
  if (existingVote.direction === voteDirection) {
    // Same vote direction - idempotent, no change needed
    return {
      vote_score: comment.vote_score,
      upvote_count: comment.upvote_count,
      downvote_count: comment.downvote_count,
    };
  }
  // Change vote direction - update vote record
  await MyGlobal.prisma.community_comment_votes.update({
    where: { id: existingVote.id },
    data: {
      direction: voteDirection,
      updated_at: now,
    },
  });
  // Score changes by ±2 when changing vote direction
  // upvote→downvote: was +1, now -1, delta = -2
  // downvote→upvote: was -1, now +1, delta = +2
  const scoreDelta = voteDirection ? 2 : -2;
  const upvoteDelta = voteDirection ? 1 : -1;
  const downvoteDelta = voteDirection ? -1 : 1;
  // Update comment vote metrics
  const updated = await MyGlobal.prisma.community_comments.update({
    where: { id: props.commentId },
    data: {
      vote_score: comment.vote_score + scoreDelta,
      upvote_count: comment.upvote_count + upvoteDelta,
      downvote_count: comment.downvote_count + downvoteDelta,
      updated_at: now,
    },
    ...CommunityCommentAtScoreTransformer.select(),
  });
  // Update author karma (±2 change when flipping vote)
  await MyGlobal.prisma.community_members.update({
    where: { id: comment.community_member_id },
    data: {
      karma: { increment: scoreDelta },
      updated_at: now,
    },
  });
  return await CommunityCommentAtScoreTransformer.transform(updated);
}
