import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformUserCommentsCommentIdVotes(props: {
  user: UserPayload;
  commentId: string;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote> {
  const { id: userId } = props.user;
  // Check comment exists and is not soft-deleted
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Check existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findFirst({
      where: {
        user_id: userId,
        comment_id: props.commentId,
      },
    });
  let created;
  // For PATCH operation, determine vote type from action (upvote/downvote/remove)
  // Since ICreate is empty, we'll default to "none" for removal or infer from context
  const voteType = "none"; // Default for patch operation when no explicit type provided
  if (existingVote) {
    // Update existing vote
    created = await MyGlobal.prisma.reddit_platform_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: voteType,
        updated_at: new Date(),
      },
      select: {
        id: true,
        user_id: true,
        comment_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    });
    // Update comment vote_score by 2 (from old to new vote type)
    const oldScore =
      existingVote.vote_type === "upvote"
        ? 1
        : existingVote.vote_type === "downvote"
          ? -1
          : 0;
    const newScore =
      created.vote_type === "upvote"
        ? 1
        : created.vote_type === "downvote"
          ? -1
          : 0;
    const scoreChange = newScore - oldScore;
    await MyGlobal.prisma.reddit_platform_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: scoreChange },
      },
    });
  } else {
    // Create new vote
    created = await MyGlobal.prisma.reddit_platform_comment_votes.create({
      data: {
        id: v4(),
        user_id: userId,
        comment_id: props.commentId,
        vote_type: voteType,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        user_id: true,
        comment_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    });
    // Update comment vote_score
    const voteScore = 0;
    await MyGlobal.prisma.reddit_platform_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: voteScore },
      },
    });
  }
  return {
    id: created.id as string & tags.Format<"uuid">,
    user_id: created.user_id as string & tags.Format<"uuid">,
    comment_id: created.comment_id as string & tags.Format<"uuid">,
    vote_type: created.vote_type as string,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
  };
}
