import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeMemberCommentsCommentIdMyVote(props: {
  member: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const commentVote = await MyGlobal.prisma.reddit_like_comment_votes.findFirst(
    {
      where: {
        comment_id: props.commentId,
        vote: {
          member_id: props.member.id,
        },
      },
      select: {
        id: true,
        vote_id: true,
        vote: {
          select: {
            id: true,
            vote_type: true,
          },
        },
      },
    },
  );
  if (commentVote === null) {
    throw new HttpException("Vote not found", 404);
  }
  const voteValue = commentVote.vote.vote_type === "upvote" ? 1 : -1;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_like_votes.delete({
      where: { id: commentVote.vote.id },
    }),
    MyGlobal.prisma.reddit_like_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: {
          decrement: voteValue,
        },
        updated_at: new Date(),
      },
    }),
  ]);
}
