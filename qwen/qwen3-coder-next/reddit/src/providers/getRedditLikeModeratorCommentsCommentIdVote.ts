import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorCommentsCommentIdVote(props: {
  moderator: ModeratorPayload;
  commentId: string;
}): Promise<IRedditLikeComment.IVoteStatus> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      vote_score: true,
      created_at: true,
    },
  });
  const vote = await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
    where: {
      comment: {
        id: props.commentId,
      },
      member: {
        id: props.moderator.id,
      },
    },
    select: {
      value: true,
    },
  });
  return {
    id: comment.id,
    value: vote ? vote.value : 0,
    score: comment.vote_score,
    created_at: comment.created_at.toISOString(),
  };
}
