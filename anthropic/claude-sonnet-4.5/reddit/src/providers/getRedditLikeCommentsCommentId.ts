import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";

export async function getRedditLikeCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeComment> {
  const { commentId } = props;

  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: commentId },
    select: {
      id: true,
      reddit_like_post_id: true,
      reddit_like_parent_comment_id: true,
      content_text: true,
      depth: true,
      vote_score: true,
      edited: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: comment.id,
    reddit_like_post_id: comment.reddit_like_post_id,
    reddit_like_parent_comment_id:
      comment.reddit_like_parent_comment_id === null
        ? undefined
        : comment.reddit_like_parent_comment_id,
    content_text:
      comment.deleted_at !== null ? "[deleted]" : comment.content_text,
    depth: comment.depth,
    vote_score: comment.vote_score,
    edited: comment.edited,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
