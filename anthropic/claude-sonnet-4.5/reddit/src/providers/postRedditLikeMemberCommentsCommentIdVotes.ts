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

export async function postRedditLikeMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeCommentVote> {
  const { member, commentId, body } = props;

  const comment = await MyGlobal.prisma.reddit_like_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  if (comment.reddit_like_member_id === member.id) {
    throw new HttpException("You cannot vote on your own comment", 403);
  }

  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        reddit_like_member_id: member.id,
        reddit_like_comment_id: commentId,
      },
    });

  let voteScoreDelta = 0;

  if (!existingVote) {
    voteScoreDelta = body.vote_value;
  } else if (existingVote.vote_value !== body.vote_value) {
    voteScoreDelta = body.vote_value - existingVote.vote_value;
  }

  const now = toISOStringSafe(new Date());

  const vote = await MyGlobal.prisma.$transaction(async (tx) => {
    let voteRecord;

    if (!existingVote) {
      const voteId = v4() as string & tags.Format<"uuid">;
      voteRecord = await tx.reddit_like_comment_votes.create({
        data: {
          id: voteId,
          reddit_like_member_id: member.id,
          reddit_like_comment_id: commentId,
          vote_value: body.vote_value,
          ip_address: null,
          user_agent: null,
          vote_weight: null,
          created_at: now,
          updated_at: now,
        },
      });
    } else {
      voteRecord = await tx.reddit_like_comment_votes.update({
        where: {
          id: existingVote.id,
        },
        data: {
          vote_value: body.vote_value,
          updated_at: now,
        },
      });
    }

    if (voteScoreDelta !== 0) {
      await tx.reddit_like_comments.update({
        where: {
          id: commentId,
        },
        data: {
          vote_score: {
            increment: voteScoreDelta,
          },
          updated_at: now,
        },
      });
    }

    return voteRecord;
  });

  return {
    id: vote.id as string & tags.Format<"uuid">,
    vote_value: vote.vote_value,
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
  };
}
