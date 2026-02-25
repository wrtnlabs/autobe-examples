import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityModeratorPostsPostIdCommentsCommentIdVotes(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string;
  commentId: string;
  body: IRedditCommunityComment.IVoteRequest;
}): Promise<IRedditCommunityComment.ISummary> {
  const userId = props.communityModerator.id;
  // Step 2: Validate comment exists and belongs to postId
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: { id: props.commentId, post_id: props.postId },
      select: {
        id: true,
        vote_score: true,
        author_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: true,
      },
    });
  // Step 3: Reject self-voting
  if (comment.author_id === userId) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Step 4: Query existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_community_comment_votes.findUnique({
      where: {
        user_id_comment_id: { user_id: userId, comment_id: props.commentId },
      },
      select: { vote_type: true },
    });
  // Step 5: Calculate delta
  const voteValueMap: Record<
    IRedditCommunityComment.IVoteRequest["voteType"],
    number
  > = {
    upvote: 1,
    downvote: -1,
    none: 0,
  };
  const newVoteValue =
    voteValueMap[props.body.voteType as "upvote" | "downvote" | "none"]; // Type assertion for type-safe indexing
  const oldVoteValue = existingVote
    ? voteValueMap[existingVote.vote_type as "upvote" | "downvote" | "none"]
    : 0;
  const delta = newVoteValue - oldVoteValue;
  // Step 6-7: Handle vote upsert/delete
  if (props.body.voteType === "none") {
    if (existingVote) {
      await MyGlobal.prisma.reddit_community_comment_votes.delete({
        where: {
          user_id_comment_id: { user_id: userId, comment_id: props.commentId },
        },
      });
    }
  } else {
    await MyGlobal.prisma.reddit_community_comment_votes.upsert({
      where: {
        user_id_comment_id: { user_id: userId, comment_id: props.commentId },
      },
      create: {
        id: v4(), // Add required id field
        user_id: userId,
        comment_id: props.commentId,
        vote_type: props.body.voteType,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      update: {
        vote_type: props.body.voteType,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Step 8: Update comment vote_score
  await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: { vote_score: { increment: delta } },
  });
  // Step 9: Update author's karma_score if voteType !== 'none'
  if (props.body.voteType !== "none") {
    await MyGlobal.prisma.reddit_community_members.update({
      where: { id: comment.author_id },
      data: { karma_score: { increment: delta } },
    });
  }
  // Step 10: Return comment summary
  const updatedComment =
    await MyGlobal.prisma.reddit_community_comments.findUnique({
      where: { id: props.commentId },
      ...RedditCommunityCommentAtSummaryTransformer.select(),
    });
  if (!updatedComment) throw new HttpException("Comment not found", 404); // Ensure non-null for transformer
  return RedditCommunityCommentAtSummaryTransformer.transform(updatedComment);
}
