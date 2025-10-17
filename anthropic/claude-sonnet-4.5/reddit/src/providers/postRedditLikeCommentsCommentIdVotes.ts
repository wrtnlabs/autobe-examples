import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeCommentVote> {
  const { member, commentId, body } = props;

  // Verify comment exists and is not deleted
  const comment = await MyGlobal.prisma.reddit_like_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Prevent self-voting
  if (comment.reddit_like_member_id === member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }

  const now = toISOStringSafe(new Date());

  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        reddit_like_member_id: member.id,
        reddit_like_comment_id: commentId,
      },
    });

  let voteRecord;
  let scoreDelta: number;

  if (existingVote) {
    // Update existing vote - calculate delta from old to new vote
    scoreDelta = body.vote_value - existingVote.vote_value;

    voteRecord = await MyGlobal.prisma.reddit_like_comment_votes.update({
      where: {
        id: existingVote.id,
      },
      data: {
        vote_value: body.vote_value,
        updated_at: now,
      },
    });
  } else {
    // Create new vote - delta is just the new vote value
    scoreDelta = body.vote_value;

    voteRecord = await MyGlobal.prisma.reddit_like_comment_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_member_id: member.id,
        reddit_like_comment_id: commentId,
        vote_value: body.vote_value,
        vote_weight: 1.0,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Update comment vote_score by the calculated delta
  await MyGlobal.prisma.reddit_like_comments.update({
    where: {
      id: commentId,
    },
    data: {
      vote_score: {
        increment: scoreDelta,
      },
    },
  });

  // Return vote record mapped to API DTO format
  return {
    id: voteRecord.id as string & tags.Format<"uuid">,
    vote_value: voteRecord.vote_value as number & tags.Type<"int32">,
    created_at: toISOStringSafe(voteRecord.created_at),
    updated_at: toISOStringSafe(voteRecord.updated_at),
  };
}
