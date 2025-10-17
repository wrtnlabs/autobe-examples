import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorCommentsCommentIdReplies(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IReplyCreate;
}): Promise<IRedditLikeComment> {
  const { moderator, commentId, body } = props;

  const parentComment =
    await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        reddit_like_post_id: true,
        depth: true,
        deleted_at: true,
      },
    });

  if (parentComment.deleted_at !== null) {
    throw new HttpException("Cannot reply to deleted comment", 400);
  }

  if (parentComment.depth >= 10) {
    throw new HttpException("Maximum comment nesting depth reached", 400);
  }

  const now = toISOStringSafe(new Date());
  const replyId = v4();

  await MyGlobal.prisma.reddit_like_comments.create({
    data: {
      id: replyId,
      reddit_like_post_id: parentComment.reddit_like_post_id,
      reddit_like_parent_comment_id: commentId,
      reddit_like_member_id: moderator.id,
      content_text: body.content_text,
      depth: parentComment.depth + 1,
      vote_score: 0,
      edited: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: replyId,
    reddit_like_post_id: parentComment.reddit_like_post_id,
    reddit_like_parent_comment_id: commentId,
    content_text: body.content_text,
    depth: parentComment.depth + 1,
    vote_score: 0,
    edited: false,
    created_at: now,
    updated_at: now,
  };
}
