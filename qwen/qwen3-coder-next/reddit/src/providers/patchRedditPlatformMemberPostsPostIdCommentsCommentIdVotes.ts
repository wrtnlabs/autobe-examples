import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: IRedditPlatformCommentVote.IUpdate;
}): Promise<IRedditPlatformCommentVote> {
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
      where: {
        member_id: props.member.id,
        comment_id: props.commentId,
      },
    });
  if (!existingVote) {
    throw new HttpException("Vote not found", 404);
  }
  const updatedVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // Recalculate comment score
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Recalculate vote score for the comment
  const votes = await MyGlobal.prisma.reddit_platform_comment_votes.findMany({
    where: { comment_id: props.commentId },
  });
  let voteScore = 0;
  for (const vote of votes) {
    if (vote.vote_type === "UPVOTE") {
      voteScore += 1;
    } else if (vote.vote_type === "DOWNVOTE") {
      voteScore -= 1;
    }
  }
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: { id: props.commentId },
    data: { vote_score: voteScore },
  });
  // Fetch related entities for transformer
  const member = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: updatedVote.member_id },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: comment.post_id },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Fetch author and post author directly from their tables
  const commentAuthor =
    await MyGlobal.prisma.reddit_platform_members.findUnique({
      where: { id: comment.author_id },
    });
  const postAuthor = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: post.author_id },
  });
  if (commentAuthor && postAuthor) {
    // Create transformed vote structure
    const voteStructure: IRedditPlatformCommentVote = {
      id: updatedVote.id,
      created_at:
        updatedVote.created_at instanceof Date
          ? toISOStringSafe(updatedVote.created_at)
          : updatedVote.created_at,
      updated_at:
        updatedVote.updated_at instanceof Date
          ? toISOStringSafe(updatedVote.updated_at)
          : updatedVote.updated_at,
      vote_type: updatedVote.vote_type as "UPVOTE" | "DOWNVOTE" | "NONE",
      vote_score:
        (updatedVote.vote_type === "UPVOTE"
          ? 1
          : updatedVote.vote_type === "DOWNVOTE"
            ? -1
            : 0) + voteScore,
      member: {
        id: member.id,
        username: member.username,
        displayName: member.display_name ?? null,
        avatarUrl: member.avatar_url ?? null,
      },
      comment: {
        id: comment.id,
        createdAt:
          comment.created_at instanceof Date
            ? toISOStringSafe(comment.created_at)
            : comment.created_at,
        content: comment.content,
        voteScore: comment.vote_score,
        author: {
          id: comment.author_id,
          username: commentAuthor.username,
          displayName: commentAuthor.display_name ?? null,
          avatarUrl: commentAuthor.avatar_url ?? null,
        },
      },
    };
    return voteStructure;
  }
  throw new HttpException("Failed to fetch related data", 500);
}
